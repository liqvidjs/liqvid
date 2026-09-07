import * as path from "node:path";

import {
  CONFIG_FILE,
  CONFIG_FILE_JSONC,
  loadEnvFiles,
} from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas";
import { Cause, Effect, FileSystem, Logger, Option, Stream } from "effect";
import { RelativeFile } from "effect-paths";

import { ROOT_HIDDEN_DIR, TYPES_AUTOGEN } from "#_/conventions.mjs";
import { getServerState, type LiqvidServerState } from "#_/initialize.mjs";
import { withLogLevel } from "#_/server-runtime.mjs";
import { getBiomePath } from "#_/utils/fs.mjs";

import { runTemplate } from "./watch-assets.mts";

/**
 * Generate the root-level .liqvid/types.ts file containing RootParams type.
 */
export const generateRootTypes = Effect.fnUntraced(
  function* (state: LiqvidServerState) {
    const fs = yield* FileSystem.FileSystem;
    const { cwd } = getServerState();

    yield* Effect.logDebug(`generating root ${TYPES_AUTOGEN}`);

    // Get rootParameters from config
    const config = Option.getOrUndefined(state.config);
    const rootParameters = config?.rootParameters ?? {};

    // Transform parameters into array format for template
    const parameters = Object.entries(rootParameters).map(([name, values]) => ({
      name,
      values,
    }));

    // Ensure .liqvid directory exists at project root
    const assetsDir = path.join(cwd, ROOT_HIDDEN_DIR);
    yield* fs.makeDirectory(assetsDir, { recursive: true });

    const biomePath = yield* getBiomePath(cwd);

    yield* runTemplate({
      biomePath,
      data: { parameters },
      out: path.join(assetsDir, TYPES_AUTOGEN),
      template: RelativeFile("root-types.ts.hbs"),
    });

    yield* Effect.log(
      `Generated root ${TYPES_AUTOGEN} with ${parameters.length} parameter(s)`,
    );
  },
  (effect) =>
    effect.pipe(
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
      Effect.ignore,
    ),
);

/** Check if the path matches either config file name. */
function isConfigFile(filePath: string): boolean {
  return filePath === CONFIG_FILE || filePath === CONFIG_FILE_JSONC;
}

/**
 * Watch liqvid.jsonc and liqvid.json for changes and regenerate root-level
 * types when rootParameters changes.
 */
export const watchRootTypes = Effect.fnUntraced(
  function* (state: LiqvidServerState) {
    const fs = yield* FileSystem.FileSystem;
    const { cwd } = getServerState();

    // Generate initial root types
    yield* withLogLevel(generateRootTypes(state)).pipe(
      // Send these logs to the console, not the service's structured logger.
      Effect.provide(Logger.layer([Logger.consolePretty()])),
    );

    // Watch for config changes
    yield* fs.watch(cwd).pipe(
      // Only react to events touching either config file.
      Stream.filter((event) => isConfigFile(event.path)),
      Stream.groupBy((event) => Effect.succeed([event.path, event] as const), {
        idleTimeToLive: "1 seconds",
      }),
      Stream.mapEffect(
        ([, group]) =>
          group.pipe(
            Stream.debounce("50 millis"),
            Stream.runForEach(() =>
              withLogLevel(generateRootTypes(state)).pipe(
                // Send these logs to the console, not the service's structured logger.
                Effect.provide(Logger.layer([Logger.consolePretty()])),
              ),
            ),
          ),
        { concurrency: "unbounded" },
      ),
      Stream.runDrain,
    );
  },
  (effect) =>
    effect.pipe(
      Effect.scoped,
      Effect.provideService(EnvFiles, loadEnvFiles(getServerState().cwd)),
    ),
);
