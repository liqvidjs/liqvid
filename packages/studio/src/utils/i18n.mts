import "server-only";

import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Option } from "effect";
import { RelativeDir, RelativeFile } from "effect-paths";

import { TRANSLATIONS_DIR } from "../conventions.mts";
import { getServerState } from "../initialize.mts";

export const DEFAULT_LOCALE = "en";

/**
 * Get translations for the current module.
 *
 * @example
 * ```tsx
 * import type TranslationsJson from "./.translations/en.json";
 *
 * type T = typeof TranslationsJson;
 *
 * async function ServerComponent() {
 *   const t: T = await getTranslations(import.meta.url);
 * }
 * ```
 */
export async function getTranslations<T>(
  /** pass `import.meta.url` here */
  url: string,

  relative = RelativeDir("."),
): Promise<T> {
  const locale = getLocale();
  const __dirname = path.dirname(fileURLToPath(url));

  const translationsDir = path.join(__dirname, relative, TRANSLATIONS_DIR);

  const translationsJson = path.join(
    translationsDir,
    RelativeFile(`${locale}.json`),
  );

  if (locale === DEFAULT_LOCALE) {
    return JSON.parse(await fsp.readFile(translationsJson, "utf8")) as T;
  }

  const [translations, fallback] = await Promise.all([
    fsp
      .readFile(translationsJson, "utf8")
      .then((data) => JSON.parse(data))
      .catch(() => ({})),
    fsp
      .readFile(
        path.join(translationsDir, RelativeFile(`${DEFAULT_LOCALE}.json`)),
        "utf8",
      )
      .then((data) => JSON.parse(data)),
  ]);

  // TODO: deep-merge
  return deepMerge(fallback, translations) as T;
}

export function getLocale() {
  const { config } = getServerState();
  return config.pipe(
    Option.flatMapNullishOr((c) => c.ui?.locale),
    Option.getOrElse(() => "en"),
  );
}

type Json = {
  [key: string]: string | number | boolean | Json | Json[];
};

function isObject(item: unknown): item is Json {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

function deepMerge(target: Json, source: Json) {
  // Create a new object to prevent mutating the original target
  const output: Json = Object.assign({}, target);

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else if (isObject(target[key])) {
          // Recursive call for nested objects
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        // Handle primitive values, arrays, or overwrites
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}
