"use client";

import * as stylex from "@stylexjs/stylex";
import Image from "next/image";

import {
  breakpoints,
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";
import githubLogo from "#_/icons/github.svg";

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

export function GitHubPagesProvider({
  onChange,
  t,
  value,
}: {
  onChange: (value: Providers["githubPages"] | undefined) => void;
  t: T;
  value: Providers["githubPages"];
}) {
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
        <input
          checked={value?.root ?? false}
          onChange={(e) =>
            onChange({
              repository: value?.repository ?? "",
              username: value?.username ?? "",
              ...value,
              root: e.target.checked,
            })
          }
          type="checkbox"
        />
        <span>{t.githubRoot}</span>
      </label>
    </ProviderCard>
  );
}
