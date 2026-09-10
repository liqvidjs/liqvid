import type { Localized } from "#_/i18n/shared.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { BackendConfigClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

/** @access parent */
export async function BackendConfig() {
  const t = await getTranslations<T>(import.meta.url);
  return <BackendConfigClient t={t} />;
}
