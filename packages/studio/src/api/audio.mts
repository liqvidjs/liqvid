import path from "node:path";

import { renderAudio } from "@liqvid/cli/render-audio";
import { loadJson, writeJSON } from "@liqvid/cli/utils";
import type { LiqvidConfig } from "@liqvid/schemas";
import { Array as Arr, Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { type AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";

import {
  ASSETS_DIR,
  AUDIO_DIR,
  AUDIO_WAV,
  CAPTIONS_FILE,
  CAPTIONS_META,
  NEXT_APP_DIR,
  RICH_TRANSCRIPT,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import { CaptionsMeta } from "../types/schemas.mts";
import { existenceOptional, readDirWithFileTypes } from "../utils/effect.mts";
import {
  ConflictError,
  InvalidError,
  NotFoundError,
} from "../utils/errors.mts";
import { createJob } from "../utils/jobs.mts";

import { WebApi } from "./contract.mts";
import { type AudioEntry, AudioMeta } from "./schemas.mts";

const AUDIO_META_FILE = RelativeFile("audio-meta.json");

/** Id used for the single audio rendering when `audio.multiple` is false. */
export const SINGLE_AUDIO_ID = RelativeDir("default");

/** Absolute path to the `.liqvid/audio` directory for a project. */
function getAudioBaseDir(projectPath: RelativeDir) {
  const { cwd } = getServerState();
  return path.join(cwd, NEXT_APP_DIR, projectPath, ASSETS_DIR, AUDIO_DIR);
}

/**
 * Absolute path to the directory holding a specific audio rendering's files.
 *
 * In single-audio mode this is `.liqvid/audio` itself; in multiple-audio mode
 * it is `.liqvid/audio/<id>`.
 */
export function getAudioDir(
  projectPath: RelativeDir,
  id: RelativeDir,
  multiple: boolean,
) {
  const base = getAudioBaseDir(projectPath);
  return multiple ? path.join(base, id) : base;
}

/** Read the resolved LiqvidConfig from server state, or die if not loaded. */
function getConfig() {
  return getServerState().config.pipe(
    Option.match({
      onNone: () => Effect.die({ message: "config not loaded" }),
      onSome: (value: LiqvidConfig) => Effect.succeed(value),
    }),
  );
}

/** Whether the project is configured for multiple audio renderings. */
function isMultiple(config: LiqvidConfig): boolean {
  return config.media?.audio?.multiple ?? false;
}

function readAudioMeta(audioDir: AbsoluteDir) {
  return loadJson(AudioMeta, path.join(audioDir, AUDIO_META_FILE));
}

/**
 * Read captions metadata for an audio rendering, if present.
 *
 * Captions metadata lives alongside the audio in the same directory.
 */
export function readCaptionsMeta(audioDir: AbsoluteDir) {
  return loadJson(CaptionsMeta, path.join(audioDir, CAPTIONS_META));
}

/**
 * Generate a datetime-based folder name (used for multiple-audio mode ids).
 */
function generateAudioId() {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  return RelativeDir(
    [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      "-",
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join(""),
  );
}

export const audioLive = HttpApiBuilder.group(WebApi, "audio", (handlers) =>
  handlers
    // list existing audio renderings for a project
    .handle("list", ({ query: { projectPath } }) =>
      Effect.gen(function* () {
        const config = yield* getConfig();
        const multiple = isMultiple(config);

        const baseDir = getAudioBaseDir(projectPath);

        /** Build an entry for one audio directory, or none if it has no meta. */
        const readEntry = (id: string, audioDir: AbsoluteDir) =>
          Effect.gen(function* () {
            const $meta =
              yield* readAudioMeta(audioDir).pipe(existenceOptional);
            if (Option.isNone($meta)) return Option.none<AudioEntry>();

            const $captions =
              yield* readCaptionsMeta(audioDir).pipe(existenceOptional);

            return Option.some<AudioEntry>({
              captions: Option.getOrNull($captions),
              id,
              meta: $meta.value,
            });
          });

        let items: AudioEntry[];

        if (multiple) {
          const entries = yield* readDirWithFileTypes(baseDir).pipe(
            existenceOptional,
            Effect.map(Option.getOrElse(() => [])),
          );

          console.log({ entries });

          const maybeItems = yield* Effect.all(
            entries
              .filter((entry) => entry[1] === "Directory")
              .map(([id]) =>
                readEntry(id, path.join(baseDir, RelativeDir(id))),
              ),
            { concurrency: 10 },
          );

          items = Arr.getSomes(maybeItems);

          // Newest first
          items.sort(
            (a, b) =>
              new Date(b.meta.createdAt).getTime() -
              new Date(a.meta.createdAt).getTime(),
          );
        } else {
          const $entry = yield* readEntry(SINGLE_AUDIO_ID, baseDir);
          items = Option.isSome($entry) ? [$entry.value] : [];
        }

        return { items, multiple };
      }).pipe(
        Effect.catchTag("PlatformError", Effect.die),
        Effect.catchTag("FileDecodeError", Effect.die),
      ),
    )
    // render a new audio track
    .handle("generate", ({ query: { projectPath } }) =>
      Effect.gen(function* () {
        const config = yield* getConfig();
        const multiple = isMultiple(config);

        const { basePath, productionServerPort } = getServerState();

        const id = multiple ? generateAudioId() : SINGLE_AUDIO_ID;
        const audioDir = getAudioDir(projectPath, id, multiple);

        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(audioDir, { recursive: true });

        const output = path.join(audioDir, AUDIO_WAV);
        const metaOutput = path.join(audioDir, AUDIO_META_FILE);

        // Build the URL for the video
        const previewPath = `${basePath || ""}/${projectPath}/`;
        const url = `http://localhost:${productionServerPort}${previewPath}`;

        const meta: AudioMeta = {
          createdAt: new Date().toISOString(),
          mimeType: "audio/wav",
          state: "running",
        };

        yield* writeJSON(metaOutput, meta);

        yield* createJob(
          "render-audio",
          renderAudio({ output, url }).pipe(
            Effect.tap(({ duration }) =>
              writeJSON<AudioMeta>(metaOutput, {
                ...meta,
                duration,
                state: "completed",
              }),
            ),
          ),
          { path: projectPath },
        );

        return { id };
      }).pipe(Effect.catchTag("PlatformError", Effect.die)),
    )
    // rename an audio rendering (multiple-audio mode only)
    .handle("rename", ({ payload: { id, newName }, query: { projectPath } }) =>
      Effect.gen(function* () {
        const config = yield* getConfig();

        if (!isMultiple(config)) {
          return yield* new InvalidError({
            message: "Cannot rename audio unless media.audio.multiple is set",
          });
        }

        // Sanitize new name (remove path separators and invalid chars)
        const sanitizedName = newName.replace(/[/\\:*?"<>|]/g, "-").trim();

        if (!sanitizedName) {
          return yield* new InvalidError({ message: "Invalid name" });
        }

        const fs = yield* FileSystem.FileSystem;

        const baseDir = getAudioBaseDir(projectPath);
        const oldPath = path.join(baseDir, RelativeDir(id));
        const newPath = path.join(baseDir, RelativeDir(sanitizedName));

        if (!(yield* fs.exists(oldPath))) {
          return yield* new NotFoundError({ message: "Audio not found" });
        }

        if (yield* fs.exists(newPath)) {
          return yield* new ConflictError({
            message: "An audio rendering with this name already exists",
          });
        }

        yield* fs.rename(oldPath, newPath);

        return { newId: sanitizedName };
      }).pipe(Effect.catchTag("PlatformError", Effect.die)),
    )
    // delete an audio rendering (and any associated captions)
    .handle("delete", ({ payload: { id }, query: { projectPath } }) =>
      Effect.gen(function* () {
        const config = yield* getConfig();
        const multiple = isMultiple(config);

        const fs = yield* FileSystem.FileSystem;
        const audioDir = getAudioDir(projectPath, RelativeDir(id), multiple);

        if (multiple) {
          yield* fs.remove(audioDir, { force: true, recursive: true });
        } else {
          // Single-audio mode: audio and captions share `.liqvid/audio`, so
          // only remove the audio-related files (leave other content intact).

          for (const file of [
            AUDIO_WAV,
            AUDIO_META_FILE,
            CAPTIONS_FILE,
            RICH_TRANSCRIPT,
            CAPTIONS_META,
          ]) {
            yield* fs.remove(path.join(audioDir, file), { force: true });
          }
        }

        return { success: true };
      }).pipe(Effect.catchTag("PlatformError", Effect.die)),
    ),
);
