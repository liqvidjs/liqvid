import path from "node:path";

import type { AbsoluteDir, RelativeDir } from "effect-paths";

import { NEXT_APP_DIR } from "#_/conventions.mjs";
import { getServerState } from "#_/initialize.mjs";

export { loadJson } from "@liqvid/cli/utils";

export { readDirWithFileTypes } from "#_/utils/effect.mjs";

export { ASSETS_DIR } from "./conventions.mts";
export { serverRuntime } from "./server-runtime.mts";

export function resolveProjectPath(projectPath: RelativeDir): AbsoluteDir {
  const { cwd } = getServerState();

  return path.join(cwd, NEXT_APP_DIR, projectPath);
}
