import type { Localized } from "#_/i18n/shared";
import { getServerState } from "#_/initialize";
import { getTranslations } from "#_/utils/i18n";

import { RebuildButtonClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export async function RebuildButton() {
  const t = await getTranslations<T>(import.meta.url);
  const { lastBuildTime } = getServerState();

  return <RebuildButtonClient lastBuildTime={lastBuildTime} t={t} />;
}
