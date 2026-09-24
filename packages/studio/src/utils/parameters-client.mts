import type { ParameterConfig, ParameterValues } from "@liqvid/schemas";

/**
 * Get default parameter values (first value of each parameter).
 */
export function getDefaultParams(
  parameters: ParameterConfig,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, values] of Object.entries(parameters)) {
    if (values.length > 0) {
      result[key] = values[0]!;
    }
  }
  return result;
}

/**
 * Interpolate path parameters (like `[lang]`) using the selected root parameter values.
 * Project-level parameters override root parameters.
 * @param path - The path containing parameters (e.g., `/[lang]/gng/1-cg/1-spaces/1-intro`)
 * @param projectParameters - Parameters defined in the project's project.json (if any)
 * @param selectedRootParams - Currently selected root parameter values
 * @returns The interpolated path with parameter values
 */
export function interpolatePathParametersWithSelected(
  path: string,
  projectParameters: ParameterConfig | undefined,
  selectedRootParams: ParameterValues,
): string {
  // Match all path parameters like [lang], [id], etc.
  return path.replace(/\[([^\]]+)\]/g, (match, paramName) => {
    // Root params
    if (selectedRootParams[paramName]) {
      return selectedRootParams[paramName];
    }
    // First value of project params
    if (projectParameters?.[paramName]?.length) {
      return projectParameters[paramName][0]!;
    }
    // If no value found, keep the original
    return match;
  });
}
