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
  Context,
  Effect,
  FileSystem,
  type PlatformError,
  Schema,
} from "effect";
import type { Multipart } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { type AbsoluteDir, RelativeDir } from "effect-paths";

import {
  ASSETS_DIR,
  RECORDING_META_FILE,
  RECORDING_RAW_BLOB,
  RECORDING_RAW_FILE,
  RECORDINGS_DIR,
} from "../conventions.mts";
import { readDirWithFileTypes } from "../utils/effect.mts";
import { getRoutesDir } from "../utils/misc.mts";
import {
  ensureParamsMarker,
  extractParameterNames,
  getParameterizedAssetsDir,
} from "../utils/parameters.mts";

import { WebApi } from "./contract.mts";
import {
  type SaveRecordingMetadata,
  SaveRecordingMetadataFromJson,
} from "./types.mts";

/**
 * Dynamic imports for server plugins. This allows loading plugins at runtime
 * which is necessary for Next.js environments where we can't use top-level
 * dynamic imports.
 */
export type DynamicImports = Record<
  string,
  () => Promise<
    {
      default?: LiqvidStudioServerPlugin;
    } & LiqvidStudioServerPlugin
  >
>;

/**
 * Context service for dynamic imports of server plugins.
 */
export const DynamicImports = Context.Service<DynamicImports>("DynamicImports");

const recordingMetaDeclaration = `import type { RecordingMeta } from "@liqvid/schemas";

declare const data: RecordingMeta;
export default data;`;

/**
 * Attempt to discover and run post-processing plugins.
 */
export function runPostProcessing(
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
    handlers
      .handle("list", ({ query: { projectPath, params: paramsJson } }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;

          const routesDir = getRoutesDir();
          const baseAssetsDir = path.join(routesDir, projectPath, ASSETS_DIR);

          // error if base assets dir doesn't exist
          if (!(yield* fs.exists(baseAssetsDir))) {
            return yield* Effect.die({
              message: "assets dir does not exist",
            });
          }

          // Parse params if provided
          const params = paramsJson
            ? (JSON.parse(paramsJson) as Record<string, string>)
            : undefined;

          // Get parameterized assets directory
          const assetsDir = getParameterizedAssetsDir(
            routesDir as AbsoluteDir,
            projectPath,
            params,
          );

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
      )
      .handleRaw("save", ({ query: { projectPath }, request }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;

          // Parse multipart data from the request
          const persisted = yield* request.multipart;

          const dynamicImports = yield* DynamicImports;

          // Parse metadata from the persisted multipart data
          const metadataField = persisted.metadata;
          if (typeof metadataField !== "string") {
            return yield* Effect.die({
              message: "missing or invalid metadata field",
            });
          }

          const metadata = yield* Schema.decodeEffect(
            SaveRecordingMetadataFromJson,
          )(metadataField);

          yield* Effect.logInfo("plugins", { plugins: metadata.plugins });

          const routesDir = getRoutesDir();
          const baseAssetsDir = path.join(routesDir, projectPath, ASSETS_DIR);

          // Get parameterized assets directory
          const paramNames = extractParameterNames(projectPath);
          const assetsDir = getParameterizedAssetsDir(
            routesDir as AbsoluteDir,
            projectPath,
            metadata.params,
          );

          // Create base assets dir and ensure params marker exists
          if (!(yield* fs.exists(baseAssetsDir))) {
            yield* fs.makeDirectory(baseAssetsDir, { recursive: true });
          }

          // Ensure params marker file exists for parameterized projects
          if (paramNames.length > 0) {
            yield* ensureParamsMarker(
              baseAssetsDir as AbsoluteDir,
              projectPath,
            );
          }

          // Create parameterized assets dir if it doesn't exist
          if (!(yield* fs.exists(assetsDir))) {
            yield* fs.makeDirectory(assetsDir, { recursive: true });
          }

          const recordingsDir = path.join(assetsDir, RECORDINGS_DIR);
          if (!(yield* fs.exists(recordingsDir))) {
            yield* fs.makeDirectory(recordingsDir, { recursive: true });
          }

          // Create recording directory with ISO datetime name
          const recordingName = new Date().toISOString().replace(/[:.]/g, "-");
          const recordingDir = path.join(
            recordingsDir,
            RelativeDir(recordingName),
          );
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

          // Write plugin data from persisted multipart
          yield* Effect.all(
            metadata.plugins.map((pluginInfo) =>
              Effect.gen(function* () {
                const pluginDir = path.join(
                  recordingDir,
                  packageNameToDirName(pluginInfo.key),
                );
                yield* fs.makeDirectory(pluginDir, { recursive: true });

                const data = persisted[pluginInfo.key];

                if (data === undefined) return;

                if (pluginInfo.isBlob) {
                  // For blob data, the persisted value is an array of PersistedFile
                  const files = data as ReadonlyArray<Multipart.PersistedFile>;
                  if (files.length > 0) {
                    const file = files[0]!;
                    const filename = pluginInfo.filename ?? RECORDING_RAW_BLOB;
                    // Read from the temporary persisted file path and write to our destination
                    const content = yield* fs.readFile(file.path);
                    yield* fs.writeFile(
                      path.join(pluginDir, filename),
                      content,
                    );
                  }
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
          yield* runPostProcessing(
            recordingDir,
            metadata.plugins,
            dynamicImports,
          );
        }).pipe(Effect.orDie),
      )
      .handle(
        "reprocess",
        ({ query: { projectPath, params: paramsJson }, payload }) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const dynamicImports = yield* DynamicImports;

            const routesDir = getRoutesDir();

            // Parse params if provided
            const params = paramsJson
              ? (JSON.parse(paramsJson) as Record<string, string>)
              : undefined;

            // Get parameterized assets directory
            const assetsDir = getParameterizedAssetsDir(
              routesDir as AbsoluteDir,
              projectPath,
              params,
            );

            const recordingsDir = path.join(assetsDir, RECORDINGS_DIR);
            const recordingDir = path.join(
              recordingsDir,
              RelativeDir(payload.recordingName),
            );

            // Check if the recording directory exists
            if (!(yield* fs.exists(recordingDir))) {
              return yield* Effect.die({
                message: `Recording directory does not exist: ${recordingDir}`,
              });
            }

            // Load recording metadata to get plugin info
            const recordingMeta = yield* loadRecordingMeta(recordingDir);

            // Convert plugin names to the format expected by runPostProcessing
            const plugins: SaveRecordingMetadata["plugins"] =
              recordingMeta.plugins.map((key) => ({
                isBlob: false, // Not used for rerun, just need the key
                key,
              }));

            yield* runPostProcessing(recordingDir, plugins, dynamicImports);

            return { success: true };
          }).pipe(Effect.orDie),
      ),
);
