import "ts-node/register/transpile-only";
import os from "os";
import path from "path";
// @ts-expect-error TypeScript complains about this not being a module
import loadSync from "./load-sync.cjs";

export const DEFAULT_LIST = [
  "liqvid.config.ts",
  "liqvid.config.js",
  "liqvid.config.json",
];
export const DEFAULT_CONFIG = DEFAULT_LIST[0];

export function parseConfig(...keys: string[]) {
  return (configPath: string) => {
    try {
      return access(loadSync(configPath), keys);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
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

// function require(filename: string) {
//   return JSON.parse(readFileSync(path.resolve(process.cwd(), filename), "utf8"));
// }

function access(o: any, keys: string[]): any {
  if (keys.length === 0) return o;
  const key = keys.shift();
  if (!o[key]) return {};
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
