"use client";

import * as stylex from "@stylexjs/stylex";

import type { SettingsConfig } from "#_/api/contract";
import { fonts } from "#_/design/styles";
import { spacing } from "#_/design/tokens.stylex";
import { PlainString } from "#_/i18n/shared";
import { Checkbox } from "#_/ui/Checkbox";
import { TextField } from "#_/ui/TextField";
import { useTranslations } from "#_/utils/react";

import type { Providers } from "../client.tsx";

import { ProviderCard } from "./ProviderCard.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

const styles = stylex.create({
  checkboxField: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export function CopyProvider({
  onChange,
  value,
}: {
  onChange: (value: Providers["copy"] | undefined) => void;
  value: NonNullable<SettingsConfig["providers"]>["copy"];
}) {
  const t = useTranslations<T>();
  const destination =
    typeof value?.destination === "string" ? value.destination : "";

  return (
    <ProviderCard
      enabled={value !== undefined}
      onToggle={(enabled) =>
        onChange(enabled ? { destination: "" } : undefined)
      }
      title={t.providerCopy}
    >
      <TextField
        label={t.copyDestination}
        onChange={(v) => onChange({ ...value, destination: v })}
        placeholder={PlainString("./dist")}
        style={fonts.filenameInput}
        value={destination}
      />
      <label sx={styles.checkboxField}>
        <Checkbox
          checked={value?.clean ?? false}
          onChange={(e) =>
            onChange({
              destination: value?.destination ?? "",
              ...value,
              clean: e.target.checked,
            })
          }
        />
        <span>{t.copyClean}</span>
      </label>
    </ProviderCard>
  );
}
