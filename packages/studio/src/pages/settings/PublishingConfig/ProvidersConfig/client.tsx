"use client";

import type { SettingsConfig } from "#_/api/contract.mjs";
import { typography } from "#_/design/styles.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";
import { useTranslations } from "#_/utils/react.js";

import { usePublishingConfigClient } from "../client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

import { CopyProvider } from "./CopyProvider.tsx";
import { GitHubPagesProvider } from "./GitHubPagesProvider.tsx";
import { LiqvidStudioProvider } from "./LiqvidStudioProvider.tsx";
import { S3Provider } from "./S3Provider.tsx";
import { SftpProvider } from "./SftpProvider.tsx";

export function ProvidersConfigClient() {
  const t = useTranslations<T>();
  const { draft, patch } = usePublishingConfigClient();

  const providers = draft.providers ?? {};

  function setProvider(
    key: keyof NonNullable<SettingsConfig["providers"]>,
    value: unknown,
  ) {
    const nextProviders = { ...providers, [key]: value };
    if (value === undefined) delete nextProviders[key];
    patch({
      providers:
        Object.keys(nextProviders).length === 0 ? undefined : nextProviders,
    });
  }

  return (
    <FieldSet>
      <Legend>{t.providers}</Legend>
      <p sx={typography.description}>{t.providersDescription}</p>

      <CopyProvider
        onChange={(v) => setProvider("copy", v)}
        value={providers.copy}
      />
      {false && (
        <GitHubPagesProvider
          onChange={(v) => setProvider("githubPages", v)}
          value={providers.githubPages}
        />
      )}
      {false && (
        <LiqvidStudioProvider
          onChange={(v) => setProvider("liqvidStudio", v)}
          value={providers.liqvidStudio}
        />
      )}
      <S3Provider onChange={(v) => setProvider("s3", v)} value={providers.s3} />
      {false && (
        <SftpProvider
          onChange={(v) => setProvider("sftp", v)}
          value={providers.sftp}
        />
      )}
    </FieldSet>
  );
}
