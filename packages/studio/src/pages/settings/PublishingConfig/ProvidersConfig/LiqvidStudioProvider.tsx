"use client";

import Image from "next/image";

import { TextField } from "#_/ui/TextField.js";
import { useTranslations } from "#_/utils/react.js";

import logo from "../../../../logo.png";
import type { Providers } from "../client.tsx";

import { ProviderCard } from "./ProviderCard.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export function LiqvidStudioProvider({
  onChange,
  value,
}: {
  onChange: (value: Providers["liqvidStudio"] | undefined) => void;
  value: Providers["liqvidStudio"];
}) {
  const t = useTranslations<T>();

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
