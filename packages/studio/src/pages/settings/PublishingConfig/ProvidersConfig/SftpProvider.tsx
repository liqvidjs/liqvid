"use client";
import { TextField } from "#_/ui/TextField.js";
import { useTranslations } from "#_/utils/react.js";

import type { Providers } from "../client.tsx";

import { ProviderCard } from "./ProviderCard.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export function SftpProvider({
  onChange,
  value,
}: {
  onChange: (value: Providers["sftp"] | undefined) => void;
  value: Providers["sftp"];
}) {
  const t = useTranslations<T>();

  return (
    <ProviderCard
      enabled={value !== undefined}
      onToggle={(enabled) =>
        onChange(enabled ? { host: "", path: "" } : undefined)
      }
      title={t.providerSftp}
    >
      <TextField
        label={t.sftpHost}
        onChange={(v) => onChange({ path: "", ...value, host: v })}
        value={value?.host ?? ""}
      />
      <TextField
        label={t.sftpPath}
        onChange={(v) => onChange({ host: "", ...value, path: v })}
        value={value?.path ?? ""}
      />
    </ProviderCard>
  );
}
