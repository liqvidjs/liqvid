import * as path from "node:path";

import { transcribe, type WhisperLogger } from "@liqvid/cli/transcribe";
import { writeJSON } from "@liqvid/cli/utils";
import { Effect, FileSystem, Option, type PlatformError } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { getServerState } from "../initialize.mts";
import type { CaptionsMeta } from "../types/schemas.mts";
import type { LoggableJob } from "../types.mts";
import { existenceOptional } from "../utils/effect.mts";
import { NotFoundError } from "../utils/errors.mts";
import { createJob } from "../utils/jobs.mts";

import { getAudioDir } from "./audio.mts";
import { WebApi } from "./contract.mts";

const AUDIO_FILE = "audio.wav";
const CAPTIONS_META_FILE = "captions-meta.json";
const CAPTIONS_FILE = "captions.vtt";
const TRANSCRIPT_FILE = "transcript.json";

/**
 * Track active caption generation jobs, keyed by `projectPath:audioId`.
 */
const activeJobs = new Set<string>();

/**
 * Write captions metadata alongside the audio it captions.
 */
function writeCaptionsMeta(audioDir: string, meta: CaptionsMeta) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.makeDirectory(audioDir, { recursive: true });
    yield* writeJSON(path.join(audioDir, CAPTIONS_META_FILE), meta);
  });
}

export const captionsLive = HttpApiBuilder.group(
  WebApi,
  "captions",
  (handlers) =>
    handlers
      // generate captions for a specific audio rendering
      .handle("generate", ({ payload: { audioId }, query: { projectPath } }) =>
        Effect.gen(function* () {
          const { config: $config, jobs } = getServerState();

          const config = yield* Option.match($config, {
            onNone: () => Effect.die({ message: "config not loaded" }),
            onSome: (c) => Effect.succeed(c),
          });

          const multiple = config.media?.audio?.multiple ?? false;
          const audioDir = getAudioDir(projectPath, audioId, multiple);

          const fs = yield* FileSystem.FileSystem;

          // The audio must have been rendered first.
          const audioFile = path.join(audioDir, AUDIO_FILE);
          if (!(yield* fs.exists(audioFile))) {
            return yield* new NotFoundError({
              message: "Audio not found; render audio before captioning",
            });
          }

          const jobKey = `${projectPath}:${audioId}`;

          // Check if already generating
          if (activeJobs.has(jobKey)) {
            return { status: "already_generating" as const };
          }
          activeJobs.add(jobKey);

          // Write initial metadata
          const initialMeta: CaptionsMeta = {
            captionsPath: path.join(audioDir, CAPTIONS_FILE),
            createdAt: new Date().toISOString(),
            status: "generating",
            transcriptPath: path.join(audioDir, TRANSCRIPT_FILE),
          };
          yield* writeCaptionsMeta(audioDir, initialMeta);

          // Start transcription in background
          const fiber = Effect.gen(function* () {
            const fiber = Effect.gen(function* () {
              const logger: WhisperLogger = {
                debug(...args) {
                  if (args.length === 2) {
                    if (args[0] === "Stdout:") {
                      job.logs.push({
                        message: args[1],
                        timestamp: new Date(),
                        type: "log",
                      });
                      return;
                    } else if (args[0] === "Stderr:") {
                      job.logs.push({
                        message: args[1],
                        timestamp: new Date(),
                        type: "error",
                      });
                      return;
                    }
                  }

                  job.logs.push({
                    message: args,
                    timestamp: new Date(),
                    type: "debug",
                  });
                },
                error(...args) {
                  job.logs.push({
                    message: args,
                    timestamp: new Date(),
                    type: "error",
                  });
                },
                log(...args) {
                  job.logs.push({
                    message: args,
                    timestamp: new Date(),
                    type: "log",
                  });
                },
              };

              yield* transcribe({
                audioFile,
                logger,
                outputDir: audioDir,
                whisperConfig: config.media?.captioning?.nodeWhisperOptions,
              });

              yield* Effect.logDebug("transcribing complete");

              yield* writeCaptionsMeta(audioDir, {
                ...initialMeta,
                status: "completed",
              });

              job.state = "completed";
            });

            yield* fiber.pipe(
              Effect.tapError((error) =>
                Effect.logError("Failed to generate captions:", error),
              ),
              Effect.catch(() => {
                job.state = "failed";
                return writeCaptionsMeta(audioDir, {
                  ...initialMeta,
                  status: "failed",
                });
              }),
            );

            activeJobs.delete(jobKey);
          });

          /** loggable job */
          const job = yield* createJob("captioning", fiber, {
            path: projectPath,
          });

          return { status: "started" as const };
        }).pipe(Effect.catchTag("PlatformError", Effect.orDie)),
      )
      // delete captions for an audio rendering (preserving the audio itself)
      .handle("delete", ({ payload: { audioId }, query: { projectPath } }) =>
        Effect.gen(function* () {
          const { config: $config } = getServerState();

          const config = yield* Option.match($config, {
            onNone: () => Effect.die({ message: "config not loaded" }),
            onSome: (c) => Effect.succeed(c),
          });

          const multiple = config.media?.audio?.multiple ?? false;
          const audioDir = getAudioDir(projectPath, audioId, multiple);

          const fs = yield* FileSystem.FileSystem;

          const metaPath = path.join(audioDir, CAPTIONS_META_FILE);
          if (!(yield* fs.exists(metaPath))) {
            return yield* new NotFoundError({
              message: "No captions found for this audio",
            });
          }

          // Remove only captions-related files; leave the audio intact.
          for (const file of [
            CAPTIONS_META_FILE,
            CAPTIONS_FILE,
            TRANSCRIPT_FILE,
          ]) {
            yield* fs.remove(path.join(audioDir, file)).pipe(existenceOptional);
          }

          return { success: true };
        }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      ),
);
