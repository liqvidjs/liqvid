import * as path from "node:path";

import type { ParameterValues } from "@liqvid/schemas";
import { AbsoluteDir, type RelativeDir } from "effect-paths";

import { ASSETS_DIR, RECORDINGS_DIR } from "#_/conventions";
import { extractParameterNames } from "#_/utils/parameters";

/** Resolve a recording directory to its project and parameter-value scope. */
export function getRecordingLocation(
  recordingDir: AbsoluteDir,
  routesDir: AbsoluteDir,
  projectPaths: readonly RelativeDir[],
): { projectParams: ParameterValues; projectPath: RelativeDir } | undefined {
  const recordingsDir = AbsoluteDir(path.dirname(recordingDir));
  if (path.basename(recordingsDir) !== RECORDINGS_DIR) return;

  const actualAssetsDir = AbsoluteDir(path.dirname(recordingsDir));
  for (const projectPath of projectPaths) {
    const assetsDir = path.join(routesDir, projectPath, ASSETS_DIR);
    const parameterPath = path.relative(assetsDir, actualAssetsDir);

    if (
      parameterPath === ".." ||
      parameterPath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(parameterPath)
    ) {
      continue;
    }

    const parameterNames = extractParameterNames(projectPath);
    const parameterValues = parameterPath ? parameterPath.split(path.sep) : [];

    if (parameterNames.length !== parameterValues.length) continue;

    return {
      projectParams: Object.fromEntries(
        parameterNames.map((name, index) => [name, parameterValues[index]!]),
      ),
      projectPath,
    };
  }

  return;
}
