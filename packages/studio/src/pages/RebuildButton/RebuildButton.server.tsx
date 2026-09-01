import { getServerState } from "#_/initialize.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { RebuildButtonClient } from "./RebuildButton.client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export async function RebuildButton() {
  const t = await getTranslations<T>(import.meta.url);
  const { lastBuildTime } = getServerState();

  return <RebuildButtonClient lastBuildTime={lastBuildTime} t={t} />;
}
