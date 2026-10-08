import type { Localized } from "#_/i18n/shared";
import { getTranslations } from "#_/utils/i18n";
import { TranslationProvider } from "#_/utils/react";

import { BasePathConfigClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

/**
 * @access parent
 * Configure the base path for Liqvid deployment.
 */
export async function BasePathConfig() {
  const t = await getTranslations<T>(import.meta.url);
  return (
    <TranslationProvider t={t}>
      <BasePathConfigClient />
    </TranslationProvider>
  );
}
