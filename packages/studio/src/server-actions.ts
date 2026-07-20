"use server";

import fsp from "node:fs/promises";
import path from "node:path";

import { type RelativeDir, RelativeFile } from "effect-paths";

import { TRANSLATIONS_DIR } from "./conventions.mts";
import { getLocale } from "./utils/i18n.mts";
import { STUDIO_ROOT } from "./utils/server.mts";

export async function getTranslationsFromServer<T>(
  componentPath: RelativeDir,
): Promise<T> {
  const locale = getLocale();

  const translationsDir = path.join(
    STUDIO_ROOT,
    componentPath,
    TRANSLATIONS_DIR,
  );

  try {
    const translationsJson = await fsp.readFile(
      path.join(translationsDir, RelativeFile(`${locale}.json`)),
      "utf8",
    );

    return JSON.parse(translationsJson) as T;
  } catch (e) {
    console.error(
      `Failed to load translations for ${componentPath} and locale ${locale}:`,
      e,
    );
    return {} as T;
  }
}
