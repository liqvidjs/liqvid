import * as path from "node:path";

import { transcribe } from "@liqvid/cli/transcribe";
import { writeJSON } from "@liqvid/cli/utils";
import { Effect, FileSystem } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { type AbsoluteDir, RelativeDir } from "effect-paths";

import {
  AUDIO_WAV,
  CAPTIONS_FILE,
  CAPTIONS_META,
  RICH_TRANSCRIPT,
} from "#_/conventions.mjs";
import { getServerState } from "#_/initialize.mjs";
import type { CaptionsMeta } from "#_/types/schemas.mjs";
import { NotFoundError } from "#_/utils/errors.mjs";
import { createJob } from "#_/utils/jobs.mjs";
import { getConfig } from "#_/utils/misc.mjs";

import { getAudioDir } from "./audio.mts";
import { WebApi } from "./contract.mts";

/**
 * The name given to a captioning job, uniquely identifying the audio it
 * captions so we can detect whether generation is already in progress.
 */
function captioningJobName(projectPath: RelativeDir, audioId: string): string {
  return `captioning:${projectPath}:${audioId}`;
}

/**
 * Write captions metadata alongside the audio it captions.
 */
function writeCaptionsMeta(audioDir: AbsoluteDir, meta: CaptionsMeta) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.makeDirectory(audioDir, { recursive: true });
    yield* writeJSON(path.join(audioDir, CAPTIONS_META), meta);
  });
}

export const captionsLive = HttpApiBuilder.group(
  WebApi,
  "captions",
  (handlers) =>
    handlers
      // generate captions for a specific audio rendering
      .handle(
        "generate",
        ({
          payload: { audioId },
          query: { projectPath, params: paramsJson },
        }) =>
          Effect.gen(function* () {
            // Parse params if provided
            const params = paramsJson
              ? (JSON.parse(paramsJson) as Record<string, string>)
              : undefined;

            const fs = yield* FileSystem.FileSystem;

            const { jobs } = getServerState();
            const config = yield* getConfig();

            const multiple = config.media?.audio?.multiple ?? false;
            const audioDir = getAudioDir(
              projectPath,
              RelativeDir(audioId),
              multiple,
              params,
            );

            // The audio must have been rendered first.
            const audioFile = path.join(audioDir, AUDIO_WAV);
            if (!(yield* fs.exists(audioFile))) {
              return yield* new NotFoundError({
                message: "Audio not found; render audio before captioning",
              });
            }

            // Check if a captioning job for this audio is already running.
            const jobName = captioningJobName(projectPath, audioId);
            for (const job of jobs.new.values()) {
              if (job.name === jobName && job.state === "running") {
                return { status: "already_generating" as const };
              }
            }

            const initialMeta: CaptionsMeta = {
              captionsPath: path.join(audioDir, CAPTIONS_FILE),
              createdAt: new Date().toISOString(),
              status: "generating",
              transcriptPath: path.join(audioDir, RICH_TRANSCRIPT),
            };

            // Start transcription in the background. The initial metadata is
            // written inside the job so that no `yield*` occurs between the
            // "already running" check and `createJob` (which registers the
            // running job synchronously), avoiding a check-then-create race.
            const fiber = Effect.gen(function* () {
              yield* writeCaptionsMeta(audioDir, initialMeta);

              yield* transcribe({
                audioFile,
                outputDir: audioDir,
                whisperConfig: config.media?.captioning?.smartWhisperOptions,
              });
            }).pipe(
              Effect.tap(() => Effect.logDebug("transcribing complete")),
              Effect.tap(() =>
                writeCaptionsMeta(audioDir, {
                  ...initialMeta,
                  status: "completed",
                }),
              ),
              Effect.tapError((error) =>
                Effect.logError("Failed to generate captions:", error),
              ),
              Effect.tapError(() =>
                writeCaptionsMeta(audioDir, {
                  ...initialMeta,
                  status: "failed",
                }),
              ),
            );

            yield* createJob(jobName, fiber, {
              path: projectPath,
            });

            return { status: "started" as const };
          }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      )
      // delete captions for an audio rendering (preserving the audio itself)
      .handle(
        "delete",
        ({
          payload: { audioId },
          query: { projectPath, params: paramsJson },
        }) =>
          Effect.gen(function* () {
            // Parse params if provided
            const params = paramsJson
              ? (JSON.parse(paramsJson) as Record<string, string>)
              : undefined;

            const config = yield* getConfig();

            const multiple = config.media?.audio?.multiple ?? false;
            const audioDir = getAudioDir(
              projectPath,
              RelativeDir(audioId),
              multiple,
              params,
            );

            const fs = yield* FileSystem.FileSystem;

            const metaPath = path.join(audioDir, CAPTIONS_META);
            if (!(yield* fs.exists(metaPath))) {
              return yield* new NotFoundError({
                message: "No captions found for this audio",
              });
            }

            // Remove only captions-related files; leave the audio intact.
            for (const file of [
              CAPTIONS_META,
              CAPTIONS_FILE,
              RICH_TRANSCRIPT,
            ]) {
              yield* fs.remove(path.join(audioDir, file), { force: true });
            }

            return { success: true };
          }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      ),
);
