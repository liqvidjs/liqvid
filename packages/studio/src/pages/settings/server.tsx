import type { Locale } from "@liqvid/schemas";

import { getSettingsConfig } from "#_/api/settings.mjs";
import { serverRuntime } from "#_/server-runtime.mjs";
import { getLocale, getTranslations } from "#_/utils/i18n.mjs";

import { SettingsClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export async function Settings() {
  const t = await getTranslations<T>(import.meta.url);
  const locale = getLocale() as Locale;

  const config = await serverRuntime.runPromise(getSettingsConfig());

  return <SettingsClient config={config} locale={locale} t={t} />;
}
