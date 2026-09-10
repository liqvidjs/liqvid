"use client";

import type { SettingsConfig } from "#_/api/contract.mjs";
import { Description } from "#_/design/styles.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";

import { usePublishingConfigClient } from "../client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

import { CopyProvider } from "./CopyProvider.tsx";
import { GitHubPagesProvider } from "./GitHubPagesProvider.tsx";
import { LiqvidStudioProvider } from "./LiqvidStudioProvider.tsx";
import { S3Provider } from "./S3Provider.tsx";
import { SftpProvider } from "./SftpProvider.tsx";

export function ProvidersConfigClient({ t }: { t: T }) {
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
      <Description>{t.providersDescription}</Description>

      <CopyProvider
        onChange={(v) => setProvider("copy", v)}
        t={t}
        value={providers.copy}
      />
      <GitHubPagesProvider
        onChange={(v) => setProvider("githubPages", v)}
        t={t}
        value={providers.githubPages}
      />
      <LiqvidStudioProvider
        onChange={(v) => setProvider("liqvidStudio", v)}
        t={t}
        value={providers.liqvidStudio}
      />
      <S3Provider
        onChange={(v) => setProvider("s3", v)}
        t={t}
        value={providers.s3}
      />
      <SftpProvider
        onChange={(v) => setProvider("sftp", v)}
        t={t}
        value={providers.sftp}
      />
    </FieldSet>
  );
}
