import type { ParameterValues, Parametrized } from "@liqvid/schemas";

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
  input: Parametrized<T> | undefined,
  parameters: ParameterValues,
): T | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) return input as T;

  return input.find((entry) =>
    Object.entries(entry).every(
      ([key, value]) => key === "value" || parameters[key] === value,
    ),
  )?.value;
}
