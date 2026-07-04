import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type Result, safeGet } from "@liqvid/fp";
import { type RecordingMeta, RecordingMetaFile } from "@liqvid/schemas";
import {
  dirNameToPackageName,
  type LiqvidStudioServerPlugin,
  packageNameToDirName,
} from "@liqvid/studio-plugin-api";
import { writeTypedJson } from "@liqvid/studio-plugin-api/server";
import { compare } from "@liqvid/utils";
import { Effect, FileSystem, Option, Schema } from "effect";
import { StatusCodes } from "http-status-codes";

import { RECORDING_META_FILE } from "../conventions.mts";
import type { DynamicImports } from "../next/api.mts";
import { safeGetOption } from "../utils/effect.mts";
import { HttpError } from "../utils/errors.mts";
import { loadJson } from "../utils/fs.mts";

import {
  type SaveRecordingMetadata,
  SaveRecordingMetadataFromJson,
} from "./types.mts";

export function listRecordings(searchParams: URLSearchParams) {
  return Effect.gen(function* () {
    const $url = safeGet(searchParams, "url");
    if ($url.isNone) {
      return yield* new HttpError({
        message: "invalid",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    let projectDir = fileURLToPath($url.unwrap());
    if (projectDir.endsWith("page.tsx")) {
      projectDir = path.dirname(projectDir);
    }

    const assetsDir = path.join(projectDir, ".liqvid");

    // error if assets dir doesn't exist
    if (!fs.existsSync(assetsDir)) {
      return yield* new HttpError({
        message: "assets dir does not exist",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    const recordingsDir = path.join(assetsDir, "recordings");

    if (!fs.existsSync(recordingsDir)) {
      return [];
    }

    const recordings = yield* Effect.promise(async () => {
      const recordingDirs = await fsp.readdir(recordingsDir, {
        withFileTypes: true,
      });
      const $recordings = await Promise.all(
        (recordingDirs as fs.Dirent<string>[]).reduce(
          (acc, entry) => {
            if (!entry.isDirectory()) return acc;

            const { name } = entry;

            const dir = path.join(recordingsDir, name);
            acc.push(
              loadJson(
                RecordingMetaFile,
                path.join(dir, RECORDING_META_FILE),
              ).then(async ($recordingMeta) => {
                const children = await fsp.readdir(dir, {
                  withFileTypes: true,
                });
                return $recordingMeta.map((file) => ({
                  ...file,
                  name: dirNameToPackageName(name),
                  plugins: children.reduce((acc, curr) => {
                    if (curr.isDirectory()) {
                      acc.push(dirNameToPackageName(curr.name));
                      return acc;
                    }
                    return acc;
                  }, [] as string[]),
                }));
              }),
            );

            return acc;
          },
          [] as Promise<Result<RecordingMeta, unknown>>[],
        ),
      );

      const recordings = $recordings.reduce((acc, $curr) => {
        if ($curr.isErr) return acc;
        acc.push($curr.unwrap());
        return acc;
      }, [] as RecordingMeta[]);

      recordings.sort((a, b) => compare(a.created, b.created));

      return recordings;
    });

    return recordings;
  });
}

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
        onNone: () =>
          Effect.fail(
            new HttpError({
              message: "missing url parameter",
              status: StatusCodes.BAD_REQUEST,
            }),
          ),
        onSome: (url) => Effect.succeed(url),
      }),
    );

    // Parse metadata
    const metadataStr = formData.get("metadata");
    if (typeof metadataStr !== "string") {
      return yield* new HttpError({
        message: "missing metadata",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const metadata = yield* Schema.decodeEffect(SaveRecordingMetadataFromJson)(
      metadataStr,
    );

    let projectDir = fileURLToPath(url);
    if (projectDir.endsWith("page.tsx")) {
      projectDir = path.dirname(projectDir);
    }

    const assetsDir = path.join(projectDir, ".liqvid");

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
