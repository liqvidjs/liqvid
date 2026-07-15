import path from "node:path";
import { fileURLToPath } from "node:url";

import { type FileDecodeError, loadJsonEffect } from "@liqvid/cli/utils";
import { type RecordingMeta, RecordingMetaFile } from "@liqvid/schemas/effect";
import {
  dirNameToPackageName,
  type LiqvidStudioServerPlugin,
  packageNameToDirName,
} from "@liqvid/studio-plugin-api";
import { writeTypedJson } from "@liqvid/studio-plugin-api/server";
import { compare } from "@liqvid/utils";
import { Effect, FileSystem, Option, type PlatformError, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { StatusCodes } from "http-status-codes";

import { ASSETS_DIR, RECORDING_META_FILE } from "../conventions.mts";
import type { DynamicImports } from "../next/api.mts";
import { readDirWithFileTypes, safeGetOption } from "../utils/effect.mts";

import { WebApi } from "./contract.mts";
import {
  type SaveRecordingMetadata,
  SaveRecordingMetadataFromJson,
} from "./types.mts";

const recordingMetaDeclaration = `import type { RecordingMeta } from "@liqvid/schemas/recording-meta";
declare const data: RecordingMeta;
export default data;`;

/**
 * Save a new recording to disk.
 */
export function saveRecording(
  searchParams: URLSearchParams,
  formData: FormData,
  dynamicImports: DynamicImports,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const url = yield* safeGetOption(searchParams, "url").pipe(
      Option.match({
        onNone: () => Effect.die({ message: "missing url parameter" }),
        onSome: (url) => Effect.succeed(url),
      }),
    );

    // Parse metadata
    const metadataStr = formData.get("metadata");
    if (typeof metadataStr !== "string") {
      return yield* Effect.die({ message: "missing metadata" });
    }

    const metadata = yield* Schema.decodeEffect(SaveRecordingMetadataFromJson)(
      metadataStr,
    );

    let projectDir = fileURLToPath(url);
    if (projectDir.endsWith("page.tsx")) {
      projectDir = path.dirname(projectDir);
    }

    const assetsDir = path.join(projectDir, ASSETS_DIR);

    // Create assets dir if it doesn't exist
    if (!(yield* fs.exists(assetsDir))) {
      yield* fs.makeDirectory(assetsDir, { recursive: true });
    }

    const recordingsDir = path.join(assetsDir, "recordings");
    if (!(yield* fs.exists(recordingsDir))) {
      yield* fs.makeDirectory(recordingsDir, { recursive: true });
    }

    // Create recording directory with ISO datetime name
    const recordingName = new Date().toISOString().replace(/[:.]/g, "-");
    const recordingDir = path.join(recordingsDir, recordingName);
    yield* fs.makeDirectory(recordingDir, { recursive: true });

    // Write recording-meta.json
    const recordingMeta: RecordingMetaFile = {
      created: new Date().toISOString(),
      duration: {
        milliseconds: metadata.durationMs,
      },
    };

    yield* Effect.promise(() =>
      writeTypedJson({
        data: recordingMeta,
        declaration: recordingMetaDeclaration,
        dirname: recordingDir,
        filename: RECORDING_META_FILE,
        pretty: true,
      }),
    );

    // Write plugin data
    for (const pluginInfo of metadata.plugins) {
      const pluginDir = path.join(
        recordingDir,
        packageNameToDirName(pluginInfo.key),
      );
      yield* fs.makeDirectory(pluginDir, { recursive: true });

      const data = formData.get(pluginInfo.key);
      if (data === null) continue;

      if (pluginInfo.isBlob) {
        // Write blob data with specified filename
        // In Node.js/Next.js, the data comes as a File/Blob-like object with arrayBuffer() method
        const filename = pluginInfo.filename ?? "data.bin";
        const blobData = data as Blob;
        const buffer = yield* Effect.promise(() =>
          blobData.arrayBuffer().then(Buffer.from),
        );
        yield* fs.writeFile(path.join(pluginDir, filename), buffer);
      } else if (typeof data === "string") {
        // Write JSON data as raw.json
        yield* fs.writeFileString(path.join(pluginDir, "raw.json"), data);
      }
    }

    // Run post-processing plugins
    yield* Effect.promise(() =>
      runPostProcessing(recordingDir, metadata.plugins, dynamicImports),
    );

    return new Response(null, { status: StatusCodes.CREATED });
  });
}

/**
 * Attempt to discover and run post-processing plugins.
 */
async function runPostProcessing(
  recordingDir: string,
  plugins: SaveRecordingMetadata["plugins"],
  dynamicImports: DynamicImports,
): Promise<void> {
  for (const pluginInfo of plugins) {
    const pluginDir = path.join(
      recordingDir,
      packageNameToDirName(pluginInfo.key),
    );

    const dynamicImporter =
      dynamicImports[`${pluginInfo.key}/liqvid-studio-server-plugin`];

    // no server plugin
    if (!dynamicImporter) {
      continue;
    }

    let serverPlugin: {
      default?: LiqvidStudioServerPlugin;
    } & LiqvidStudioServerPlugin;

    try {
      // Try to import the server plugin
      serverPlugin = await dynamicImporter();
    } catch (e) {
      console.error(`error loading server plugin for ${pluginInfo.key}`, e);
      continue;
    }

    const plugin = serverPlugin.default ?? serverPlugin;

    if (!plugin.postProcessRecording) continue;

    try {
      await plugin.postProcessRecording({ dirname: pluginDir });
    } catch (e) {
      console.error(`error in ${pluginInfo.key}`, e);
    }
  }
}

export const recordingsLive = HttpApiBuilder.group(
  WebApi,
  "recordings",
  (handlers) =>
    handlers.handle("list", ({ query: { url } }) =>
      Effect.gen(function* () {
        let projectDir = fileURLToPath(url);
        if (projectDir.endsWith("page.tsx")) {
          projectDir = path.dirname(projectDir);
        }

        const fs = yield* FileSystem.FileSystem;

        const assetsDir = path.join(projectDir, ASSETS_DIR);

        // error if assets dir doesn't exist
        if (!(yield* fs.exists(assetsDir))) {
          return yield* Effect.die({
            message: "assets dir does not exist",
          });
        }

        const recordingsDir = path.join(assetsDir, "recordings");

        if (!(yield* fs.exists(recordingsDir))) {
          return [] as RecordingMeta[];
        }

        const recordingDirs = yield* readDirWithFileTypes(recordingsDir);

        const recordings = yield* Effect.all(
          recordingDirs.reduce(
            (acc, [filename, stats]) => {
              if (stats.type !== "Directory") return acc;

              const dir = path.join(recordingsDir, filename);
              acc.push(
                Effect.gen(function* () {
                  const file = yield* loadJsonEffect(
                    RecordingMetaFile,
                    path.join(dir, RECORDING_META_FILE),
                  );

                  const children = yield* readDirWithFileTypes(dir);

                  return {
                    ...file,
                    name: dirNameToPackageName(filename),
                    plugins: children.reduce((acc, [name, stats]) => {
                      if (stats.type === "Directory") {
                        acc.push(dirNameToPackageName(name));
                      }
                      return acc;
                    }, [] as string[]),
                  };
                }),
              );

              return acc;
            },
            // TODO: find more idiomatic way to write this
            [] as Effect.Effect<
              RecordingMeta,
              FileDecodeError | PlatformError.PlatformError,
              FileSystem.FileSystem
            >[],
          ),
        );

        recordings.sort((a, b) => compare(a.created, b.created));

        return recordings;
      }).pipe(
        Effect.catchTag("FileDecodeError", Effect.die),
        Effect.catchTag("PlatformError", Effect.die),
      ),
    ),
);
