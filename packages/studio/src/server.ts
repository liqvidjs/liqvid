import path from "node:path";

import type { AbsoluteDir, RelativeDir } from "effect-paths";

import { NEXT_APP_DIR } from "#_/conventions";
import { getServerState } from "#_/initialize";

export { loadJson } from "@liqvid/cli/utils";

export { readDirWithFileTypes } from "#_/utils/effect";

export { ASSETS_DIR } from "./conventions.ts";
export type { Localized } from "./i18n/shared.ts";
export { serverRuntime } from "./server-runtime.ts";
export { getTranslations } from "./utils/i18n.ts";
export { createJob } from "./utils/jobs.ts";
export { getConfig, getRoutesDir } from "./utils/misc.ts";
export { getParameterizedAssetsDir } from "./utils/parameters.ts";

export function resolveProjectPath(projectPath: RelativeDir): AbsoluteDir {
  const { cwd } = getServerState();

  return path.join(cwd, NEXT_APP_DIR, projectPath);
}
