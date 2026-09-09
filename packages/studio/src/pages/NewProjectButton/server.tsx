import type { Localized } from "#_/i18n/shared.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { NewProjectButtonClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export async function NewProjectButton() {
  const t = await getTranslations<T>(import.meta.url);

  return <NewProjectButtonClient t={t} />;
}
