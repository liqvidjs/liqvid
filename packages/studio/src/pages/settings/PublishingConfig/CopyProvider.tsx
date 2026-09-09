"use client";

import * as stylex from "@stylexjs/stylex";

import type { SettingsConfig } from "#_/api/contract.mjs";
import {
  breakpoints,
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";

import type { Providers, T } from "./client.tsx";
import { ProviderCard } from "./ProviderCard.tsx";
import { TextField } from "./TextField.tsx";

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
  t,
  value,
}: {
  onChange: (value: Providers["copy"] | undefined) => void;
  t: T;
  value: NonNullable<SettingsConfig["providers"]>["copy"];
}) {
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
        placeholder="./dist"
        value={destination}
      />
      <label sx={styles.checkboxField}>
        <input
          checked={value?.clean ?? false}
          onChange={(e) =>
            onChange({
              destination: value?.destination ?? "",
              ...value,
              clean: e.target.checked,
            })
          }
          type="checkbox"
        />
        <span>{t.copyClean}</span>
      </label>
    </ProviderCard>
  );
}
