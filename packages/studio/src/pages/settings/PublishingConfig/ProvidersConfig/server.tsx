import type { Localized } from "#_/i18n/shared.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { ProvidersConfigClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

/**
 * @access parent
 * Configure the base path for Liqvid deployment.
 */
export async function ProvidersConfig() {
  const t = await getTranslations<T>(import.meta.url);
  return <ProvidersConfigClient t={t} />;
}
