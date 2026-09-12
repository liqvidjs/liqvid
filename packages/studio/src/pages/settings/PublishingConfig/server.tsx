import { getSettingsConfig } from "#_/api/settings.mjs";
import { ConfigSection } from "#_/components/ConfigSection.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { serverRuntime } from "#_/server-runtime.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { BackendConfig } from "./BackendConfig/server.tsx";
import { BasePathConfig } from "./BasePathConfig/server.tsx";
import { PublishingConfigClient } from "./client.tsx";
// import { MediaConfig } from "./MediaConfig/server.tsx";
import { ProvidersConfig } from "./ProvidersConfig/server.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export async function PublishingConfig() {
  const t = await getTranslations<T>(import.meta.url);

  const config = await serverRuntime.runPromise(getSettingsConfig());

  return (
    <ConfigSection description={t.description} heading={t.title}>
      <PublishingConfigClient config={config} t={t}>
        <BackendConfig />
        <ProvidersConfig />
        <BasePathConfig />
        {/* <MediaConfig /> */}
      </PublishingConfigClient>
    </ConfigSection>
  );
}
