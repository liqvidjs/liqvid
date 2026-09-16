import type { Parametrized } from "@liqvid/schemas";

/**
 * Get default parameter values (first value of each parameter).
 */
export function getDefaultParams(
  parameters: Readonly<Record<string, readonly string[]>>,
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
  projectParameters: Readonly<Record<string, readonly string[]>> | undefined,
  selectedRootParams: Readonly<Record<string, string>>,
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

/**
 * Resolve a {@link Parametrized} value to a plain value given a set of
 * parameter values.
 *
 * - If the input is a plain value, it is returned as-is.
 * - If the input is an array of entries, the first entry whose parameter keys
 *   all match the provided values is returned. If no entry matches,
 *   `undefined` is returned.
 *
 * @example
 * ```ts
 * const title: ParametrizedString = [
 *   { lang: "en", value: "Spaces" },
 *   { lang: "fr", value: "Espaces" },
 * ];
 * resolveParametrized(title, { lang: "fr" }); // "Espaces"
 * resolveParametrized("Hello", {}); // "Hello"
 * ```
 */
export function resolveParametrized<T>(
  input: Parametrized<T>,
  params: Readonly<Record<string, string>>,
): T | undefined {
  if (!Array.isArray(input)) {
    return input;
  }

  for (const entry of input) {
    const matches = Object.entries(entry).every(
      ([key, val]) => key === "value" || params[key] === val,
    );
    if (matches) {
      return entry.value;
    }
  }

  return undefined;
}
