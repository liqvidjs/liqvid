import path from "node:path";

import type { ParameterConfig } from "@liqvid/schemas";
import { Option } from "effect";
import type { AbsoluteDir, RelativeDir } from "effect-paths";

import { NEXT_APP_DIR } from "#_/conventions";
import { getServerState, initializeServer } from "#_/initialize";

export { loadJson, readDirWithFileTypes } from "@liqvid/cli/utils";

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

/** Return workspace project paths and their effective parameter definitions. */
export async function getWorkspaceProjects(): Promise<{
  projects: readonly {
    path: RelativeDir;
    parameters?: ParameterConfig;
  }[];
  rootParameters: ParameterConfig;
}> {
  await initializeServer();

  const { config, projects } = getServerState();
  if (Option.isNone(config)) {
    throw new Error("Server configuration is not initialized");
  }

  return {
    projects: Object.values(projects).map(
      ({ path: projectPath, parameters }) =>
        parameters ? { parameters, path: projectPath } : { path: projectPath },
    ),
    rootParameters: config.value.rootParameters ?? {},
  };
}
