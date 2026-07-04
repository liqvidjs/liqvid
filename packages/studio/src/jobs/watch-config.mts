import * as fs from "node:fs";
import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { LiqvidConfigFromJson } from "@liqvid/schemas/effect";
import { Console, Effect } from "effect";

import { EnvFiles } from "../../../schemas/src/env-vars.mts";
import { CONFIG_FILE } from "../conventions.mts";
import type { LiqvidServerState } from "../initialize.mts";
import { loadJsonEffect } from "../utils/effect.mts";

import { loadEnvFiles } from "./preview-server.mts";

/**
 * Load and parse liqvid.json.
 */
export function loadLiqvidConfig() {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  return loadJsonEffect(LiqvidConfigFromJson, configPath);
}

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
    const configPath = path.join(process.cwd(), CONFIG_FILE);

    /** Watch the config file itself for changes. */
    const watchConfigFile = () => {
      fs.watch(configPath, (eventType) => {
        console.log({ configPath, eventType });
        if (eventType === "change") {
          Effect.runPromise(
            reloadConfig(state, `${CONFIG_FILE} changed, reloading...`).pipe(
              Effect.provide(NodeFileSystem.layer),
              Effect.provideService(EnvFiles, loadEnvFiles(process.cwd())),
            ),
          );
        }
      });
    };

    try {
      watchConfigFile();
    } catch {
      // Config file doesn't exist, watch the directory for it to be created
      const dir = process.cwd();

      fs.watch(dir, (_eventType, filename) => {
        if (filename === CONFIG_FILE) {
          Effect.runPromise(
            reloadConfig(state, `${CONFIG_FILE} detected, loading...`).pipe(
              Effect.provide(NodeFileSystem.layer),
              Effect.provideService(EnvFiles, loadEnvFiles(process.cwd())),
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
