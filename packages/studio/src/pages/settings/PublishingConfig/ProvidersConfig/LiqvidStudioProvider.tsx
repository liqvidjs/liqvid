"use client";

import Image from "next/image";

import logo from "../../../../logo.png";
import type { Providers, T } from "../client.tsx";
import { TextField } from "../TextField.tsx";

import { ProviderCard } from "./ProviderCard.tsx";

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
      icon={<Image alt="" height={24} src={logo} width={24} />}
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
