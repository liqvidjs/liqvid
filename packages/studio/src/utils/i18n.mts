import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Locale } from "@liqvid/schemas";
import { Option } from "effect";
import { RelativeDir, RelativeFile } from "effect-paths";

import { TRANSLATIONS_DIR } from "#_/conventions.mjs";
import { getServerState } from "#_/initialize.mjs";

import type CommonTranslationsJson from "../.translations/en.json";

export const DEFAULT_LOCALE = "en";

/**
 * Translations for commonly-used words like "close", "cancel", etc., shared
 * across the studio UI.
 */
export type CommonTranslations = typeof CommonTranslationsJson;

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
  importMetaUrl: string,

  relative: RelativeDir = RelativeDir("."),
): Promise<T> {
  const locale = getLocale();
  const __dirname = path.dirname(fileURLToPath(importMetaUrl));

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

/**
 * Get translations for commonly-used words like "close", "cancel", etc.,
 * shared across the studio UI. For use in server components.
 *
 * @example
 * ```tsx
 * async function ServerComponent() {
 *   const common = await getCommonTranslations();
 *   return <button>{common.close}</button>;
 * }
 * ```
 */
export function getCommonTranslations(): Promise<CommonTranslations> {
  return getTranslations<CommonTranslations>(
    import.meta.url,
    RelativeDir(".."),
  );
}

export function getLocale(): Locale {
  const { config } = getServerState();
  return config.pipe(
    Option.flatMapNullishOr((c) => c.ui?.locale),
    Option.getOrElse(() => "en" as const),
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
