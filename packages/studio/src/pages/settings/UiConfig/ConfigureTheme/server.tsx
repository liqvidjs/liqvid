import { Description } from "#_/design/styles.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { getConfigSync } from "#_/initialize.mjs";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";
import { getTranslations } from "#_/utils/i18n.mjs";

import { ConfigureThemeClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

/** @access parent */
export async function ConfigureTheme() {
  const t = await getTranslations<T>(import.meta.url);
  const theme = getConfigSync().ui.theme;

  return (
    <FieldSet>
      <Legend>{t.heading}</Legend>
      <Description>{t.description}</Description>
      <ConfigureThemeClient t={t} theme={theme} />
    </FieldSet>
  );
}
