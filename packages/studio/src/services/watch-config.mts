import {
  CONFIG_FILE,
  CONFIG_FILE_JSONC,
  loadEnvFiles,
  loadLiqvidConfig,
} from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas";
import { Effect, FileSystem, Option, Stream } from "effect";

import { getServerState, type LiqvidServerState } from "#_/initialize.mjs";

/** Check if the path matches either config file name. */
function isConfigFile(filePath: string): boolean {
  return filePath === CONFIG_FILE || filePath === CONFIG_FILE_JSONC;
}

/**
 * Reload the config into `state.config`, logging the reason.
 *
 * Whether this is a first-time detection or a change is derived from whether a
 * config was already loaded, rather than from the watch event's tag. Editors
 * that save atomically (e.g. Vim) replace the file via a rename shuffle, so the
 * OS reports a `Create` even when the file already existed — the event tag is
 * therefore not a reliable signal for "new" vs "changed".
 */
const reloadConfig = Effect.fnUntraced(function* (
  state: LiqvidServerState,
  changedFile: string,
) {
  const existed = Option.isSome(state.config);
  yield* Effect.log(
    existed
      ? `${changedFile} changed, reloading...`
      : `${changedFile} detected, loading...`,
  );
  state.config = yield* loadLiqvidConfig().pipe(Effect.option);
});

/**
 * Watch liqvid.jsonc and liqvid.json for changes and reload when modified.
 *
 * Uses the Effect `FileSystem.watch` API, which yields a `Stream` of
 * `WatchEvent`s. We watch the containing directory (rather than the file
 * itself) so that the watch keeps working even when the config file does not
 * exist yet — a bare file watch would fail on `stat`, and would also be torn
 * down if the file were removed. Node reports the changed entry as a path
 * relative to the watched directory, so we filter on the config basename.
 */
export const watchLiqvidConfig = Effect.fnUntraced(
  function* (state: LiqvidServerState) {
    const fs = yield* FileSystem.FileSystem;
    const { cwd } = getServerState();

    yield* fs.watch(cwd).pipe(
      // Only react to events touching either config file.
      Stream.filter((event) => isConfigFile(event.path)),
      // The OS watcher (and editors' atomic-save shuffles) frequently emit
      // several events for a single logical file change, which would otherwise
      // fan out into duplicate reloads. Group events by their path and debounce
      // each group so a burst collapses into a single dispatch. Idle groups are
      // torn down after `idleTimeToLive`.
      Stream.groupBy((event) => Effect.succeed([event.path, event] as const), {
        idleTimeToLive: "1 seconds",
      }),
      Stream.mapEffect(
        ([configFile, group]) =>
          group.pipe(
            Stream.debounce("50 millis"),
            Stream.runForEach(() => reloadConfig(state, configFile)),
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
