import { CONFIG_FILE, loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas";
import { Effect, FileSystem, Stream } from "effect";

import { getServerState, type LiqvidServerState } from "../initialize.mts";

/**
 * Reload the config into `state.config`, logging the reason.
 */
function reloadConfig(state: LiqvidServerState, message: string) {
  return Effect.gen(function* () {
    yield* Effect.log(message);
    state.config = yield* loadLiqvidConfig().pipe(Effect.option);
  });
}

/**
 * Watch liqvid.json for changes and reload when modified.
 *
 * Uses the Effect `FileSystem.watch` API, which yields a `Stream` of
 * `WatchEvent`s. We watch the containing directory (rather than the file
 * itself) so that the watch keeps working even when the config file does not
 * exist yet — a bare file watch would fail on `stat`, and would also be torn
 * down if the file were removed. Node reports the changed entry as a path
 * relative to the watched directory, so we filter on the config basename.
 */
export function watchLiqvidConfig(state: LiqvidServerState) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const { cwd } = getServerState();

    yield* fs.watch(cwd).pipe(
      // Only react to events touching the config file itself.
      Stream.filter((event) => event.path === CONFIG_FILE),
      // The OS watcher (and editors' atomic-save shuffles) frequently emit
      // several events for a single logical file change, which would otherwise
      // fan out into duplicate reloads. Group events by their path and debounce
      // each group so a burst collapses into a single dispatch. Idle groups are
      // torn down after `idleTimeToLive`.
      Stream.groupBy((event) => Effect.succeed([event.path, event] as const), {
        idleTimeToLive: "1 seconds",
      }),
      Stream.mapEffect(
        ([, group]) =>
          group.pipe(
            Stream.debounce("50 millis"),
            Stream.runForEach((event) =>
              reloadConfig(
                state,
                event._tag === "Create"
                  ? `${CONFIG_FILE} detected, loading...`
                  : `${CONFIG_FILE} changed, reloading...`,
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
