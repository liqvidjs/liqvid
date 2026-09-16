import type { Localized } from "#_/i18n/shared.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";
import { TranslationProvider } from "#_/utils/react.js";

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
