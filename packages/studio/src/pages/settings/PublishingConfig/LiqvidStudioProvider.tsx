"use client";

import type { Providers, T } from "./client.tsx";
import { ProviderCard } from "./ProviderCard.tsx";
import { TextField } from "./TextField.tsx";

export function LiqvidStudioProvider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["liqvidStudio"] | undefined) => void;
  t: T;
  value: Providers["liqvidStudio"];
}) {
  return (
    <ProviderCard
      enabled={value !== undefined}
      onToggle={(enabled) => onChange(enabled ? { username: "" } : undefined)}
      title={t.providerLiqvidStudio}
    >
      <TextField
        label={t.username}
        onChange={(v) => onChange({ username: v })}
        value={value?.username ?? ""}
      />
    </ProviderCard>
  );
}
