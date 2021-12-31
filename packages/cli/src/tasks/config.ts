import os from "os";
import path from "path";
import yargs from "yargs";

export const DEFAULT_LIST = ["liqvid.config.ts", "liqvid.config.js", "liqvid.config.json"];
export const DEFAULT_CONFIG = DEFAULT_LIST[0];

export function parseConfig(...keys: string[]) {
  require("ts-node/register/transpile-only");
  
  return (configPath: string) => {
    try {
      return access(require(configPath), keys);
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

function access(o: any, keys: string[]): any {
  if (keys.length === 0)
    return o;
  const key = keys.shift();
  if (!o[key])
    return {};
  return access(o[key], keys);
}

export const BROWSER_EXECUTABLE: yargs.Options = {
  alias: "x",
  desc: "Path to a Chrome/ium executable. If not specified and a suitable executable cannot be found, one will be downloaded during rendering.",
  normalize: true
};

export const CONCURRENCY: yargs.Options = {
  alias: "n",
  default: Math.floor(os.cpus().length / 2),
  desc: "How many threads to use",
  type: "number"
};
