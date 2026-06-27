import os from "node:os";
import path from "node:path";

import { CONFIG_FILE } from "./conventions.mts";
import loadSync from "./load-sync.cts";

export const DEFAULT_LIST = [CONFIG_FILE];
export const DEFAULT_CONFIG = DEFAULT_LIST[0]!;

export function parseConfig(...keys: string[]) {
  return (configPath: string): object => {
    try {
      return access((loadSync as (path: string) => unknown)(configPath), keys);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
        // default value => assume not specified
        if (path.join(process.cwd(), DEFAULT_CONFIG) === configPath) {
          return {};
        }
        throw e;
      } else {
        throw e;
      }
    }
  };
}

/**
 * Parse config file and transform the result to match CLI option names.
 * @param keys - Path to the config section (e.g., ["transcribe"])
 * @param transform - Function to transform config values to CLI option names
 */
export function parseConfigWithTransform<T extends object>(
  keys: string[],
  transform: (config: T) => Record<string, unknown>,
) {
  return (configPath: string): object => {
    try {
      const config = access(
        (loadSync as (path: string) => unknown)(configPath),
        [...keys],
      ) as T;
      return transform(config);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
        // default value => assume not specified
        if (path.join(process.cwd(), DEFAULT_CONFIG) === configPath) {
          return {};
        }
        throw e;
      } else {
        throw e;
      }
    }
  };
}

// biome-ignore lint/suspicious/noExplicitAny: config object can have any shape
function access(o: any, keys: string[]): object {
  if (keys.length === 0) return o as object;
  const key = keys.shift();
  if (key === undefined || !o[key]) return {};
  return access(o[key], keys);
}

export const BROWSER_EXECUTABLE = {
  alias: "x",
  desc: "Path to a Chrome/ium executable. If not specified and a suitable executable cannot be found, one will be downloaded during rendering.",
  normalize: true,
  type: "string",
} as const;

export const CONCURRENCY = {
  alias: "n",
  default: Math.floor(os.cpus().length / 2),
  desc: "How many threads to use",
  type: "number",
} as const;
