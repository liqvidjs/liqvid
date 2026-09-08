import { ConfigSection } from "#_/components/ConfigSection.js";
import { getTranslations, type Localized } from "#_/utils/i18n.mjs";

import { ConfigureLocale } from "./ConfigureLocale/server.tsx";
import { ConfigureTheme } from "./ConfigureTheme/server.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export async function UiConfig() {
  const t = await getTranslations<T>(import.meta.url);

  return (
    <ConfigSection description={t.description} heading={t.heading}>
      <ConfigureLocale />
      <ConfigureTheme />
    </ConfigSection>
  );
}
