"use client";

import Image from "next/image";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

import githubLogo from "#_/icons/github.svg";
import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "#_/ui/Select";
import { TextField } from "#_/ui/TextField";
import { useTranslations } from "#_/utils/react";

import type { Providers } from "../client.tsx";

import { ProviderCard } from "./ProviderCard.tsx";

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
        onChange(
          enabled
            ? { directory: "/", repository: "", username: "" }
            : undefined,
        )
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
      <div>
        <div>{t.githubDirectory}</div>
        <SelectRoot
          onValueChange={(directory) =>
            onChange({
              repository: value?.repository ?? "",
              username: value?.username ?? "",
              ...value,
              directory: directory as "/" | "/docs",
            })
          }
          value={value?.directory ?? "/"}
        >
          <SelectTrigger>
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  <SelectItem value="/">
                    <SelectItemText>{t.githubRoot}</SelectItemText>
                    <SelectItemIndicator />
                  </SelectItem>
                  <SelectItem value="/docs">
                    <SelectItemText>{t.githubDocs}</SelectItemText>
                    <SelectItemIndicator />
                  </SelectItem>
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </SelectRoot>
      </div>
    </ProviderCard>
  );
}
