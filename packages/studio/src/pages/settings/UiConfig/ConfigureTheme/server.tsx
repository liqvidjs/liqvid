import { PaletteIcon } from "@phosphor-icons/react/dist/ssr";

import { Description } from "#_/design/styles.js";
import { getConfigSync } from "#_/initialize.mjs";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";
import { getTranslations, type Localized } from "#_/utils/i18n.mjs";

import { ConfigureThemeClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

/** @access parent */
export async function ConfigureTheme() {
  const t = await getTranslations<T>(import.meta.url);
  const theme = getConfigSync().ui.theme;

  return (
    <FieldSet>
      <Legend>
        <PaletteIcon weight="bold" />
        {t.heading}
      </Legend>
      <Description>{t.description}</Description>
      <ConfigureThemeClient theme={theme} />
    </FieldSet>
  );
}
