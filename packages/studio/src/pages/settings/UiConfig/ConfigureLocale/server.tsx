import { typography } from "#_/design/styles.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";
import { getLocale, getTranslations } from "#_/utils/i18n.mjs";

import { ConfigureLocaleClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

/** @access parent */
export async function ConfigureLocale() {
  const t = await getTranslations<T>(import.meta.url);
  const locale = getLocale();

  return (
    <FieldSet>
      <Legend>{t.heading}</Legend>
      <p sx={typography.description}>{t.description}</p>
      <ConfigureLocaleClient locale={locale} />
    </FieldSet>
  );
}
