"use client";

import * as stylex from "@stylexjs/stylex";
import Image from "next/image";

import githubLogo from "#_/icons/github.svg";

import { type Providers, styles, type T } from "./client.tsx";
import { ProviderCard } from "./ProviderCard.tsx";
import { TextField } from "./TextField.tsx";

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
      <label {...stylex.props(styles.checkboxField)}>
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
