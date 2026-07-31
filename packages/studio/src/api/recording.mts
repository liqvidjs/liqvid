import path from "node:path";

import { type FileDecodeError, loadJson } from "@liqvid/cli/utils";
import { type RecordingMeta, RecordingMetaFile } from "@liqvid/schemas";
import {
  dirNameToPackageName,
  type LiqvidStudioServerPlugin,
  packageNameToDirName,
} from "@liqvid/studio-plugin-api";
import { writeTypedJson } from "@liqvid/studio-plugin-api/server";
import { compare } from "@liqvid/utils";
import {
  Cause,
  Effect,
  FileSystem,
  Option,
  type PlatformError,
  Schema,
} from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { type AbsoluteDir, RelativeDir } from "effect-paths";
import { StatusCodes } from "http-status-codes";

import {
  ASSETS_DIR,
  RECORDING_META_FILE,
  RECORDING_RAW_BLOB,
  RECORDING_RAW_FILE,
  RECORDINGS_DIR,
} from "../conventions.mts";
import type { DynamicImports } from "../next/api.mts";
import { readDirWithFileTypes, safeGetOption } from "../utils/effect.mts";
import { getRoutesDir } from "../utils/misc.mts";

import { WebApi } from "./contract.mts";
import {
  type SaveRecordingMetadata,
  SaveRecordingMetadataFromJson,
} from "./types.mts";

const recordingMetaDeclaration = `import type { RecordingMeta } from "@liqvid/schemas";

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

    const projectPath = yield* safeGetOption(searchParams, "projectPath").pipe(
      Option.match({
        onNone: () => Effect.die({ message: "missing projectPath parameter" }),
        onSome: (projectPath) => Effect.succeed(RelativeDir(projectPath)),
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

    yield* Effect.logInfo("plugins", { plugins: metadata.plugins });

    const assetsDir = path.join(getRoutesDir(), projectPath, ASSETS_DIR);

    // Create assets dir if it doesn't exist
    if (!(yield* fs.exists(assetsDir))) {
      yield* fs.makeDirectory(assetsDir, { recursive: true });
    }

    const recordingsDir = path.join(assetsDir, RECORDINGS_DIR);
    if (!(yield* fs.exists(recordingsDir))) {
      yield* fs.makeDirectory(recordingsDir, { recursive: true });
    }

    // Create recording directory with ISO datetime name
    const recordingName = new Date().toISOString().replace(/[:.]/g, "-");
    const recordingDir = path.join(recordingsDir, RelativeDir(recordingName));
    yield* fs.makeDirectory(recordingDir, { recursive: true });

    // Write recording-meta.json
    const recordingMeta: RecordingMetaFile = {
      created: new Date().toISOString(),
      duration: {
        milliseconds: metadata.durationMs,
      },
    };

    yield* writeTypedJson({
      data: recordingMeta,
      declaration: recordingMetaDeclaration,
      dirname: recordingDir,
      filename: RECORDING_META_FILE,
      pretty: true,
    });

    // Write plugin data
    yield* Effect.all(
      metadata.plugins.map((pluginInfo) =>
        Effect.gen(function* () {
          const pluginDir = path.join(
            recordingDir,
            packageNameToDirName(pluginInfo.key),
          );
          yield* fs.makeDirectory(pluginDir, { recursive: true });

          const data = formData.get(pluginInfo.key);
          console.dir({ data, pluginInfo });
          if (data === null) return;

          if (pluginInfo.isBlob) {
            // Write blob data with specified filename
            // In Node.js/Next.js, the data comes as a File/Blob-like object with arrayBuffer() method
            const filename = pluginInfo.filename ?? RECORDING_RAW_BLOB;
            const blobData = data as Blob;
            const buffer = yield* Effect.promise(() =>
              blobData.arrayBuffer().then(Buffer.from),
            );
            yield* fs.writeFile(path.join(pluginDir, filename), buffer);
          } else if (typeof data === "string") {
            // Write raw JSON data
            yield* fs.writeFileString(
              path.join(pluginDir, RECORDING_RAW_FILE),
              data,
            );
          }
        }).pipe(Effect.annotateLogs({ _plugin: pluginInfo.key })),
      ),
      { concurrency: "unbounded" },
    );

    // Run post-processing plugins
    yield* runPostProcessing(recordingDir, metadata.plugins, dynamicImports);

    return new Response(null, { status: StatusCodes.CREATED });
  }).pipe(
    Effect.annotateLogs({
      _op: "saveRecording",
    }),
  );
}

/**
 * Attempt to discover and run post-processing plugins.
 */
function runPostProcessing(
  recordingDir: AbsoluteDir,
  plugins: SaveRecordingMetadata["plugins"],
  dynamicImports: DynamicImports,
) {
  return Effect.all(
    plugins.map((pluginInfo) =>
      Effect.gen(function* () {
        const pluginDir = path.join(
          recordingDir,
          packageNameToDirName(pluginInfo.key),
        );

        const dynamicImporter =
          dynamicImports[`${pluginInfo.key}/liqvid-studio-server-plugin`];

        // no server plugin
        if (!dynamicImporter) {
          yield* Effect.logDebug(`no server plugin for ${pluginInfo.key}`);
          return;
        }

        const serverPlugin: {
          default?: LiqvidStudioServerPlugin;
        } & LiqvidStudioServerPlugin = yield* Effect.tryPromise(
          dynamicImporter,
        ).pipe(
          Effect.tapCause((cause) =>
            Effect.logError(
              `error loading server plugin for ${pluginInfo.key}`,
              Cause.pretty(cause),
            ),
          ),
        );

        const plugin = serverPlugin.default ?? serverPlugin;

        if (!plugin.postProcessRecording) {
          yield* Effect.logDebug(
            `no postProcessRecording for ${pluginInfo.key}`,
          );
          return;
        }

        yield* Effect.logDebug(
          `running postProcessRecording for ${pluginInfo.key}`,
        );
        const program = plugin.postProcessRecording({ dirname: pluginDir });

        if (program instanceof Promise) {
          yield* Effect.tryPromise(() => program).pipe(
            Effect.tapCause((cause) =>
              Effect.logError(
                `error running postProcessRecording for ${pluginInfo.key}`,
                Cause.pretty(cause),
              ),
            ),
          );
        } else {
          yield* program;
        }
      }).pipe(Effect.annotateLogs({ _plugin: pluginInfo.key })),
    ),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.annotateLogs({
      _op: "runPostProcessing",
    }),
  );
}

/**
 * Read a single recording directory into a {@link RecordingMeta}, discovering
 * its plugins from the immediate subdirectories.
 */
export function loadRecordingMeta(recordingDir: AbsoluteDir) {
  return Effect.gen(function* () {
    const file = yield* loadJson(
      RecordingMetaFile,
      path.join(recordingDir, RECORDING_META_FILE),
    );

    const children = yield* readDirWithFileTypes(recordingDir);

    return {
      ...file,
      name: dirNameToPackageName(path.basename(recordingDir)),
      plugins: children.reduce((acc, [name, kind]) => {
        if (kind === "Directory") {
          acc.push(dirNameToPackageName(name));
        }
        return acc;
      }, [] as string[]),
    } satisfies RecordingMeta;
  });
}

export const recordingsLive = HttpApiBuilder.group(
  WebApi,
  "recordings",
  (handlers) =>
    handlers.handle("list", ({ query: { projectPath } }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        const assetsDir = path.join(getRoutesDir(), projectPath, ASSETS_DIR);

        // error if assets dir doesn't exist
        if (!(yield* fs.exists(assetsDir))) {
          return yield* Effect.die({
            message: "assets dir does not exist",
          });
        }

        const recordingsDir = path.join(assetsDir, RECORDINGS_DIR);

        if (!(yield* fs.exists(recordingsDir))) {
          return [] as RecordingMeta[];
        }

        const recordingDirs = yield* readDirWithFileTypes(recordingsDir);

        const recordings = yield* Effect.all(
          recordingDirs.reduce(
            (acc, [filename, kind]) => {
              if (kind !== "Directory") return acc;

              const dir = path.join(recordingsDir, filename);
              acc.push(loadRecordingMeta(dir));

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
