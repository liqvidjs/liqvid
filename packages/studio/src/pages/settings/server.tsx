import { NodeFileSystem } from "@effect/platform-node";
import type { Locale } from "@liqvid/schemas";
import { Effect } from "effect";

import { getSettingsConfig } from "#_/api/settings.mjs";
import { getLocale, getTranslations } from "#_/utils/i18n.mjs";

import { SettingsClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export async function Settings() {
  const t = await getTranslations<T>(import.meta.url);
  const locale = getLocale() as Locale;

  const config = await Effect.runPromise(
    getSettingsConfig().pipe(Effect.provide(NodeFileSystem.layer)),
  );

  return <SettingsClient config={config} locale={locale} t={t} />;
}
