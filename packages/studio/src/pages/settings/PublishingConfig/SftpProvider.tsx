"use client";
import type { Providers, T } from "./client.tsx";
import { ProviderCard } from "./ProviderCard.tsx";
import { TextField } from "./TextField.tsx";

export function SftpProvider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["sftp"] | undefined) => void;
  t: T;
  value: Providers["sftp"];
}) {
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
