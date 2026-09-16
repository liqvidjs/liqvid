"use client";

import * as stylex from "@stylexjs/stylex";
import Image from "next/image";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

import { spacing } from "#_/design/tokens.stylex.js";
import githubLogo from "#_/icons/github.svg";
import { Checkbox } from "#_/ui/Checkbox.js";
import { TextField } from "#_/ui/TextField.js";
import { useTranslations } from "#_/utils/react.js";

import type { Providers } from "../client.tsx";

import { ProviderCard } from "./ProviderCard.tsx";

const styles = stylex.create({
  checkboxField: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export function GitHubPagesProvider({
  onChange,
  value,
}: {
  onChange: (value: Providers["githubPages"] | undefined) => void;
  value: Providers["githubPages"];
}) {
  const t = useTranslations<T>();

  return (
    <ProviderCard
      enabled={value !== undefined}
      icon={<Image alt="" height={24} src={githubLogo} />}
      onToggle={(enabled) =>
        onChange(enabled ? { repository: "", username: "" } : undefined)
      }
      title={t.providerGitHubPages}
    >
      <TextField
        label={t.username}
        onChange={(v) => onChange({ repository: "", ...value, username: v })}
        value={value?.username}
      />
      <TextField
        label={t.repository}
        onChange={(v) => onChange({ username: "", ...value, repository: v })}
        value={value?.repository}
      />
      <label sx={styles.checkboxField}>
        <Checkbox
          checked={value?.root ?? false}
          onChange={(e) =>
            onChange({
              repository: value?.repository ?? "",
              username: value?.username ?? "",
              ...value,
              root: e.target.checked,
            })
          }
        />
        <span>{t.githubRoot}</span>
      </label>
    </ProviderCard>
  );
}
