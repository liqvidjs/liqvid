"use server";

import fsp from "node:fs/promises";
import path from "node:path";

import { getServerState } from "./initialize.mts";
import { STUDIO_ROOT } from "./utils/server.mts";

export async function getTranslationsFromServer<T>(
  componentPath: string,
): Promise<T> {
  const { locale } = getServerState();
  const translationsDir = path.join(
    STUDIO_ROOT,
    componentPath,
    ".translations",
  );

  try {
    const translationsJson = await fsp.readFile(
      path.join(translationsDir, `${locale}.json`),
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
