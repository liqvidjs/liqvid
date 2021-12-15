import path from "path";

export const DEFAULT_LIST = ["liqvid.config.ts", "liqvid.config.js", "liqvid.config.json"];
export const DEFAULT_CONFIG = DEFAULT_LIST[0];

export function parseConfig(key: string) {
  return (configPath: string) => {
    try {
      return require(configPath)[key];
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
