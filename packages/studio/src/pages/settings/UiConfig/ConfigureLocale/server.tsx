import { TranslateIcon } from "@phosphor-icons/react/dist/ssr";

import { Description } from "#_/design/styles.js";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";
import { getLocale, getTranslations } from "#_/utils/i18n.mjs";

import { ConfigureLocaleClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

/** @access parent */
export async function ConfigureLocale() {
  const t = await getTranslations<T>(import.meta.url);
  const locale = getLocale();

  return (
    <FieldSet>
      <Legend>
        <TranslateIcon weight="bold" />
        {t.heading}
      </Legend>
      <Description>{t.description}</Description>
      <ConfigureLocaleClient locale={locale} />
    </FieldSet>
  );
}
