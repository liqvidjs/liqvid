import { typography } from "#_/design/styles";
import type { Localized } from "#_/i18n/shared";
import { getConfigSync } from "#_/initialize";
import { FieldSet, Legend } from "#_/ui/Fieldset";
import { getTranslations } from "#_/utils/i18n";

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
      <p sx={typography.description}>{t.description}</p>
      <ConfigureThemeClient t={t} theme={theme} />
    </FieldSet>
  );
}
