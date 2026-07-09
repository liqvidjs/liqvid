import * as path from "node:path";

import { renderAudio } from "@liqvid/cli/render-audio";
import { transcribe, type WhisperLogger } from "@liqvid/cli/transcribe";
import { loadJsonEffect } from "@liqvid/cli/utils";
import { truncate } from "@liqvid/utils";
import {
  Console,
  Effect,
  FileSystem,
  Option,
  type PlatformError,
} from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { StatusCodes } from "http-status-codes";

import { getServerState } from "../initialize.mts";
import { CaptionsMeta } from "../types/schemas.mts";
import type { LoggableJob } from "../types.mts";
import { NotFoundError } from "../utils/errors.mts";

import { WebApi } from "./contract-effect.mts";

const CAPTIONS_DIR = ".liqvid/captions";
const META_FILE = "meta.json";
const AUDIO_FILE = "audio.wav";

/** Track active caption generation jobs */
const activeJobs = new Set<string>();

/**
 * Read captions metadata from the project.
 */
function readCaptionsMeta(projectDir: string) {
  const metaPath = path.join(projectDir, CAPTIONS_DIR, META_FILE);
  return loadJsonEffect(CaptionsMeta, metaPath);
}

/**
 * Write captions metadata to the project.
 */
function writeCaptionsMeta(projectDir: string, meta: CaptionsMeta) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const captionsDir = path.join(projectDir, CAPTIONS_DIR);
    yield* fs.makeDirectory(captionsDir, { recursive: true });

    const metaPath = path.join(captionsDir, META_FILE);
    yield* fs.writeFileString(metaPath, JSON.stringify(meta, null, 2));
  });
}

/**
 * Generate captions for a project using Whisper.
 */
export function generateCaptions(searchParams: URLSearchParams) {
  return Effect.gen(function* () {
    const {
      basePath,
      config: $config,
      productionServerPort,
      jobs,
    } = getServerState();

    const config = yield* Option.match($config, {
      onNone: () =>
        Effect.die({
          message: "config not loaded",
        }),
      onSome: (c) => Effect.succeed(c),
    });

    const projectPath = searchParams.get("projectPath");
    if (!projectPath) {
      return yield* Effect.die({
        message: "projectPath is required",
      });
    }

    /** loggable job */
    const job: LoggableJob = {
      logs: {
        debug: [],
        error: [],
        log: [],
      },
      name: "captioning",
      path: projectPath,
      startTime: new Date(),
      state: "running",
    };
    jobs.captioning.add(job);

    // get project dir
    const projectDir = path.join(process.cwd(), "app", projectPath);

    // Check if already generating
    if (activeJobs.has(projectPath)) {
      return { status: "already_generating" as const };
    }

    // Mark as generating
    activeJobs.add(projectPath);

    const outputDir = path.join(projectDir, CAPTIONS_DIR);
    const audioFile = path.join(outputDir, AUDIO_FILE);

    // Build the URL for the video
    const previewPath = `${basePath || ""}/${projectPath}/`;
    const url = `http://localhost:${productionServerPort}${previewPath}`;

    // Write initial metadata
    const initialMeta: CaptionsMeta = {
      captionsPath: path.join(outputDir, "captions.vtt"),
      createdAt: new Date().toISOString(),
      status: "generating",
      transcriptPath: path.join(outputDir, "transcript.json"),
    };
    yield* writeCaptionsMeta(projectDir, initialMeta);

    // Start transcription in background
    yield* Effect.forkDetach(
      Effect.gen(function* () {
        const fiber = Effect.gen(function* () {
          // Create the audio file by rendering the video's audio track
          const audioStart = performance.now();
          yield* Effect.promise(() => renderAudio({ output: audioFile, url }));
          const audioElapsed = performance.now() - audioStart;
          yield* Console.log(
            `Created audio file for ${projectPath} in ${truncate(audioElapsed / 1000, 2)}s`,
          );

          const logger: WhisperLogger = {
            debug(...args) {
              job.logs.debug.push(...args);
            },
            error(...args) {
              job.logs.error.push(...args);
            },
            log(...args) {
              job.logs.log.push(...args);
            },
          };

          yield* transcribe({
            audioFile,
            logger,
            outputDir,
            whisperConfig: config.media?.captioning?.nodeWhisperOptions,
          });

          yield* Console.log("transcribing complete");

          // Update metadata to completed
          const completedMeta: CaptionsMeta = {
            ...initialMeta,
            status: "completed",
          };
          yield* writeCaptionsMeta(projectDir, completedMeta);

          yield* Console.log("wrote captions meta file");

          job.state = "completed";
        });

        yield* fiber.pipe(
          Effect.catch((error) => {
            console.error("Failed to generate captions:", error);

            // Update metadata to failed
            const failedMeta: CaptionsMeta = {
              ...initialMeta,
              status: "failed",
            };

            job.state = "failed";

            return writeCaptionsMeta(projectDir, failedMeta);
          }),
        );

        activeJobs.delete(projectPath);
      }),
    );

    return { status: "started" as const };
  });
}

export const captionsLive = HttpApiBuilder.group(
  WebApi,
  "captions",
  (handlers) =>
    // list existing captions for a project
    handlers.handle("list", ({ query: { projectPath } }) => {
      return Effect.gen(function* () {
        const projectDir = path.join(process.cwd(), "app", projectPath);

        return yield* readCaptionsMeta(projectDir).pipe(
          // A missing captions meta file is not a server error: surface it as 404.
          Effect.catchTag("PlatformError", (error) => {
            if (error.reason._tag === "NotFound") {
              return Effect.fail(
                new NotFoundError({
                  message: "No captions found for this project",
                }),
              );
            }

            return Effect.die(error);
          }),
        );
      }).pipe(Effect.orDie);
    }),
);
