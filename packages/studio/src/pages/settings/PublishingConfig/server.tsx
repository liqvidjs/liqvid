import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import * as stylex from "@stylexjs/stylex";

import { getSettingsConfig } from "#_/api/settings.mjs";
import { ConfigSection } from "#_/components/ConfigSection.js";
import { serverRuntime } from "#_/server-runtime.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { PublishingConfigClient, styles } from "./client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

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
      <p {...stylex.props(styles.description)}>{t.configurationDescription}</p>

      <PublishingConfigClient config={config} t={t} />
    </ConfigSection>
  );
}
