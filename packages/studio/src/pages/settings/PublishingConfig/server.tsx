import { GearIcon } from "@phosphor-icons/react/dist/ssr";

import { getSettingsConfig } from "#_/api/settings.mjs";
import { ConfigSection } from "#_/components/ConfigSection.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { serverRuntime } from "#_/server-runtime.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { PublishingConfigClient } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export async function PublishingConfig() {
  const t = await getTranslations<T>(import.meta.url);

  const config = await serverRuntime.runPromise(getSettingsConfig());

  return (
    <ConfigSection
      description={t.configurationDescription}
      heading={
        <>
          <GearIcon weight="bold" />
          {t.configuration}
        </>
      }
    >
      <PublishingConfigClient config={config} t={t} />
    </ConfigSection>
  );
}
