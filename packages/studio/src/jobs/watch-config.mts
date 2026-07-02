import * as fs from "node:fs";
import * as path from "node:path";

import { Err, Ok, type Result, Some } from "@liqvid/fp";
import { LiqvidConfig, type LiqvidConfigOut } from "@liqvid/schemas";
import type z from "zod";

import { CONFIG_FILE } from "../conventions.mts";
import type { LiqvidServerState } from "../initialize.mts";

/**
 * Load and parse liqvid.json.
 */
export function loadLiqvidConfig(): Result<
  LiqvidConfigOut,
  Error | z.ZodError
> {
  const configPath = path.join(process.cwd(), CONFIG_FILE);

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const rawConfig = JSON.parse(content);
    const result = LiqvidConfig.safeParse(rawConfig);

    if (result.success) {
      return Ok(result.data);
    }

    return Err(result.error);
  } catch (e) {
    return Err(e as Error);
  }
}

/**
 * Watch liqvid.config.json for changes and reload when modified.
 */
export async function watchLiqvidConfig(
  state: LiqvidServerState,
): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_FILE);

  try {
    fs.watch(configPath, (eventType) => {
      if (eventType === "change") {
        console.log(`${CONFIG_FILE} changed, reloading...`);
        const $config = loadLiqvidConfig();
        if ($config.isOk) {
          state.config = Some($config.unwrap());
        }
      }
    });
  } catch {
    // Config file doesn't exist, watch the directory for it to be created
    const dir = process.cwd();

    fs.watch(dir, (_eventType, filename) => {
      if (filename === CONFIG_FILE) {
        console.log(`${CONFIG_FILE} detected, loading...`);
        state.config = loadLiqvidConfig();

        // Now watch the file itself for changes
        try {
          fs.watch(configPath, (eventType) => {
            if (eventType === "change") {
              console.log(`${CONFIG_FILE} changed, reloading...`);
              state.config = loadLiqvidConfig();
            }
          });
        } catch {
          // File may have been deleted again
        }
      }
    });
  }
}
