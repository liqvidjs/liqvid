import type { Locale } from "@liqvid/schemas";

import { getLocale, getTranslations } from "../../utils/i18n.mts";

import { SettingsClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export async function Settings() {
  const t = await getTranslations<T>(import.meta.url);
  const locale = getLocale() as Locale;

  return <SettingsClient locale={locale} t={t} />;
}
