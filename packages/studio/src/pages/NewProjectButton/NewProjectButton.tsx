import { getTranslations } from "../../utils/i18n.mts";

import { NewProjectButtonClient } from "./NewProjectButton.client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export async function NewProjectButton() {
  const t = await getTranslations<T>(import.meta.url);

  return <NewProjectButtonClient t={t} />;
}
