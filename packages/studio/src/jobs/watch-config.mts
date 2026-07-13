import * as fs from "node:fs";
import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas/effect";
import { Console, Effect } from "effect";

import { CONFIG_FILE } from "../conventions.mts";
import { getServerState, type LiqvidServerState } from "../initialize.mts";

/**
 * Reload the config into `state.config`, logging the reason.
 */
function reloadConfig(state: LiqvidServerState, message: string) {
  return Effect.gen(function* () {
    yield* Console.log(message);
    state.config = yield* loadLiqvidConfig().pipe(Effect.option);
  });
}

/**
 * Watch liqvid.config.json for changes and reload when modified.
 */
export function watchLiqvidConfig(state: LiqvidServerState) {
  return Effect.sync(() => {
    const { cwd } = getServerState();
    const configPath = path.join(cwd, CONFIG_FILE);

    /** Watch the config file itself for changes. */
    const watchConfigFile = () => {
      fs.watch(configPath, (eventType) => {
        if (eventType === "change") {
          Effect.runPromise(
            reloadConfig(state, `${CONFIG_FILE} changed, reloading...`).pipe(
              Effect.provide(NodeFileSystem.layer),
              Effect.provideService(EnvFiles, loadEnvFiles(cwd)),
            ),
          );
        }
      });
    };

    try {
      watchConfigFile();
    } catch {
      fs.watch(cwd, (_eventType, filename) => {
        if (filename === CONFIG_FILE) {
          Effect.runPromise(
            reloadConfig(state, `${CONFIG_FILE} detected, loading...`).pipe(
              Effect.provide(NodeFileSystem.layer),
              Effect.provideService(EnvFiles, loadEnvFiles(cwd)),
            ),
          );

          // Now watch the file itself for changes
          try {
            watchConfigFile();
          } catch {
            // File may have been deleted again
          }
        }
      });
    }
  });
}
