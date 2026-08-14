import path from "node:path";

import { Effect, FileSystem, Option, type PlatformError } from "effect";
import { type AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";

import { ASSETS_DIR } from "../conventions.mts";
import { getServerState } from "../initialize.mts";

import { readDirWithFileTypes } from "./effect.mts";

/**
 * Filename for the parameter marker file.
 * Format: `.params=lang,locale` where parameters are comma-separated.
 */
export const PARAMS_MARKER_PREFIX = ".params=";

/**
 * Extract parameter names from a project path.
 * e.g., `/[lang]/[locale]/some-project` → `["lang", "locale"]`
 */
export function extractParameterNames(projectPath: string): RelativeDir[] {
  const matches = projectPath.matchAll(/\[([^\]]+)\]/g);
  return Array.from(matches, (m) => m[1]! as RelativeDir);
}

/**
 * Parse the .params= marker filename to extract parameter names.
 * e.g., `.params=lang,locale` → `["lang", "locale"]`
 */
export function parseParamsMarker(filename: string): string[] | null {
  if (!filename.startsWith(PARAMS_MARKER_PREFIX)) {
    return null;
  }
  const paramsPart = filename.slice(PARAMS_MARKER_PREFIX.length);
  if (!paramsPart) {
    return [];
  }
  return paramsPart.split(",");
}

/**
 * Generate the .params= marker filename from parameter names.
 * e.g., `["lang", "locale"]` → `.params=lang,locale`
 */
export function generateParamsMarkerFilename(paramNames: string[]): string {
  return `${PARAMS_MARKER_PREFIX}${paramNames.join(",")}`;
}

/**
 * Check if a project has parameters (contains `[paramName]` in path).
 */
export function hasParameters(projectPath: string): boolean {
  return /\[[^\]]+\]/.test(projectPath);
}

/**
 * Build the assets subdirectory path for a specific set of parameter values.
 * e.g., for params `["lang", "locale"]` and values `{ lang: "en", locale: "US" }`,
 * returns `"en/US"`.
 */
export function buildParameterSubpath(
  paramNames: string[],
  paramValues: Record<string, string>,
): RelativeDir {
  const parts = paramNames.map((name) => paramValues[name] ?? "");
  return RelativeDir(parts.join("/"));
}

/**
 * Get the assets directory for a project, considering parameters.
 *
 * For projects without parameters:
 *   `{routesDir}/{projectPath}/.liqvid`
 *
 * For projects with parameters:
 *   `{routesDir}/{projectPath}/.liqvid/{paramValue1}/{paramValue2}/...`
 *
 * @param routesDir - The absolute path to the routes directory
 * @param projectPath - The project path (may contain [param] placeholders)
 * @param paramValues - The values for each parameter (required if project has parameters)
 */
export function getParameterizedAssetsDir(
  routesDir: AbsoluteDir,
  projectPath: RelativeDir,
  paramValues?: Record<string, string>,
): AbsoluteDir {
  const paramNames = extractParameterNames(projectPath);
  const baseAssetsDir = path.join(routesDir, projectPath, ASSETS_DIR);

  if (paramNames.length === 0) {
    // No parameters - use base assets dir
    return baseAssetsDir as AbsoluteDir;
  }

  if (!paramValues) {
    throw new Error(
      `Project "${projectPath}" has parameters but no values were provided`,
    );
  }

  const subpath = buildParameterSubpath(paramNames, paramValues);
  return path.join(baseAssetsDir, subpath);
}

/**
 * Ensure the .params= marker file exists in the assets directory.
 * Creates the marker file if the project has parameters.
 */
export function ensureParamsMarker(
  assetsDir: AbsoluteDir,
  projectPath: RelativeDir,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const paramNames = extractParameterNames(projectPath);

    if (paramNames.length === 0) {
      // No parameters - no marker needed
      return;
    }

    // Ensure assets directory exists
    if (!(yield* fs.exists(assetsDir))) {
      yield* fs.makeDirectory(assetsDir, { recursive: true });
    }

    const markerFilename = generateParamsMarkerFilename(paramNames);
    const markerPath = path.join(assetsDir, RelativeFile(markerFilename));

    if (!(yield* fs.exists(markerPath))) {
      // Create empty marker file
      yield* fs.writeFileString(markerPath, "");
      yield* Effect.logDebug(`Created params marker: ${markerFilename}`);
    }
  });
}

/**
 * Get all existing parameter value combinations for a project by reading
 * the directory structure under .liqvid.
 *
 * Returns an array of parameter value objects, e.g.:
 * `[{ lang: "en", locale: "US" }, { lang: "en", locale: "CA" }, ...]`
 */
export function getExistingParameterCombinations(
  assetsDir: AbsoluteDir,
  paramNames: string[],
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    if (paramNames.length === 0) {
      return [{}];
    }

    const combinations: Record<string, string>[] = [];

    // Use Effect to traverse directories
    yield* traverseParameterDirs(
      fs,
      assetsDir,
      paramNames,
      0,
      {},
      combinations,
    );

    return combinations;
  });
}

function traverseParameterDirs(
  fs: FileSystem.FileSystem,
  currentDir: AbsoluteDir,
  paramNames: string[],
  depth: number,
  currentValues: Record<string, string>,
  combinations: Record<string, string>[],
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    if (depth >= paramNames.length) {
      combinations.push({ ...currentValues });
      return;
    }

    const paramName = paramNames[depth]!;

    if (!(yield* fs.exists(currentDir))) {
      return;
    }

    const entries = yield* readDirWithFileTypes(currentDir);

    for (const [entry, kind] of entries) {
      // Skip marker files and hidden files (except .liqvid subdirs which we handle elsewhere)
      if (entry.startsWith(".")) {
        continue;
      }

      if (kind === "Directory") {
        const entryPath = path.join(currentDir, entry);
        yield* traverseParameterDirs(
          fs,
          entryPath,
          paramNames,
          depth + 1,
          { ...currentValues, [paramName]: entry },
          combinations,
        );
      }
    }
  });
}

/**
 * Get the parameter values for a project from the project.json and liqvid.json.
 * Returns all possible parameter value combinations.
 */
export function getProjectParameterValues(
  projectParameters: Record<string, readonly string[]> | undefined,
): Record<string, readonly string[]> {
  const { config } = getServerState();

  // Start with root parameters as fallback
  const rootParameters = Option.flatMapNullishOr(
    config,
    (c) => c.rootParameters,
  ).pipe(Option.getOrElse(() => ({}) as Record<string, readonly string[]>));

  // Project parameters override root parameters
  return { ...rootParameters, ...projectParameters };
}

/**
 * Get the first (default) value for each parameter.
 */
export function getDefaultParameterValues(
  parameterValues: Record<string, string[]>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, values] of Object.entries(parameterValues)) {
    if (values.length > 0) {
      result[key] = values[0]!;
    }
  }
  return result;
}
