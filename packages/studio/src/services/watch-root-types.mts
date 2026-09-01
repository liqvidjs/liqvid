import * as path from "node:path";

import {
  CONFIG_FILE,
  loadEnvFiles,
} from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas";
import {
  Cause,
  Effect,
  FileSystem,
  Logger,
  Option,
  References,
  Stream,
} from "effect";
import { RelativeFile } from "effect-paths";

import { ROOT_HIDDEN_DIR, TYPES_AUTOGEN } from "#_/conventions.mjs";
import { getServerState, type LiqvidServerState } from "#_/initialize.mjs";
import { getBiomePath } from "#_/utils/fs.mjs";
import { getLogLevel } from "#_/utils/misc.mjs";

import { runTemplate } from "./watch-assets.mts";

/**
 * Generate the root-level .liqvid/types.ts file containing RootParams type.
 */
export function generateRootTypes(state: LiqvidServerState) {
  return Effect.gen(function* () {
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

    const biomePath = yield* Effect.promise(() => getBiomePath(cwd));

    yield* runTemplate({
      biomePath,
      data: { parameters },
      out: path.join(assetsDir, TYPES_AUTOGEN),
      template: RelativeFile("root-types.ts.hbs"),
    });

    yield* Effect.log(
      `Generated root ${TYPES_AUTOGEN} with ${parameters.length} parameter(s)`,
    );
  }).pipe(
    Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
    Effect.ignore,
  );
}

/**
 * Watch liqvid.json for changes and regenerate root-level types when rootParameters changes.
 */
export function watchRootTypes(state: LiqvidServerState) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const { cwd } = getServerState();

    // Generate initial root types
    yield* generateRootTypes(state).pipe(
      Effect.provide(Logger.layer([Logger.consolePretty()])),
      Effect.provideService(References.MinimumLogLevel, getLogLevel()),
    );

    // Watch for config changes
    yield* fs.watch(cwd).pipe(
      // Only react to events touching the config file itself.
      Stream.filter((event) => event.path === CONFIG_FILE),
      Stream.groupBy((event) => Effect.succeed([event.path, event] as const), {
        idleTimeToLive: "1 seconds",
      }),
      Stream.mapEffect(
        ([, group]) =>
          group.pipe(
            Stream.debounce("50 millis"),
            Stream.runForEach(() =>
              generateRootTypes(state).pipe(
                Effect.provide(Logger.layer([Logger.consolePretty()])),
                Effect.provideService(
                  References.MinimumLogLevel,
                  getLogLevel(),
                ),
              ),
            ),
          ),
        { concurrency: "unbounded" },
      ),
      Stream.runDrain,
    );
  }).pipe(
    Effect.scoped,
    Effect.provideService(EnvFiles, loadEnvFiles(getServerState().cwd)),
  );
}
