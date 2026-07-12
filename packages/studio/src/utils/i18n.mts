import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getServerState } from "../initialize.mts";

export const DEFAULT_LOCALE = "en";

/**
 * Get translations for the current module.
 *
 * @example
 * ```tsx
 * import type T from "./.translations/en.json";
 *
 * type T = typeof T;
 *
 * async function ServerComponent() {
 *   const t: T = await getTranslations(import.meta.url);
 * }
 * ```
 */
export async function getTranslations<T>(
  /** pass `import.meta.url` here */
  url: string,
): Promise<T> {
  const { locale } = getServerState();
  const __dirname = path.dirname(fileURLToPath(url));
  const translationsDir = path.join(__dirname, ".translations");

  const translationsJson = path.join(translationsDir, `${locale}.json`);

  if (locale === DEFAULT_LOCALE) {
    return JSON.parse(await fsp.readFile(translationsJson, "utf8")) as T;
  }

  const [translations, fallback] = await Promise.all([
    fsp
      .readFile(translationsJson, "utf8")
      .then((data) => JSON.parse(data))
      .catch(() => ({})),
    fsp
      .readFile(path.join(translationsDir, `${DEFAULT_LOCALE}.json`), "utf8")
      .then((data) => JSON.parse(data)),
  ]);

  // TODO: deep-merge
  return { ...fallback, ...translations } as T;
}
