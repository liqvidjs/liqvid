"use client";

import * as stylex from "@stylexjs/stylex";

import { fonts } from "#_/design/styles.js";
import { colors, spacing, text } from "#_/design/tokens.stylex.js";
import type { Localized, LocalizedReactNode } from "#_/i18n/shared.mjs";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";
import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "#_/ui/Select.js";

import { usePublishingConfigClient } from "../client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

/** Providers that can host content files. */
const CONTENT_PROVIDERS = [
  "copy",
  "githubPages",
  "liqvidStudio",
  "s3",
  "sftp",
] as const;

/** Providers that can host media files. */
const MEDIA_PROVIDERS = ["copy", "liqvidStudio", "s3", "sftp"] as const;

type ContentProvider = (typeof CONTENT_PROVIDERS)[number];
type MediaProvider = (typeof MEDIA_PROVIDERS)[number];

/** Sentinel value used by selects to represent "no provider chosen". */
const NONE = "__none__";

const styles = stylex.create({

  field: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },

  fieldLabel: {
    fontSize: text.sm,
  },

  positioner: {
    zIndex: 30,
  },
});

/** @package */
export function BackendConfigClient({ t }: { t: T }) {
  const { draft, patch } = usePublishingConfigClient();

  const contentBackend = draft.backend?.content ?? NONE;
  const mediaBackend = draft.backend?.media ?? NONE;

  function setBackend(key: "content" | "media", value: string) {
    const backend = { ...draft.backend };
    if (value === NONE) {
      delete backend[key];
    } else if (key === "content") {
      backend.content = value as ContentProvider;
    } else {
      backend.media = value as MediaProvider;
    }
    patch({
      backend: Object.keys(backend).length === 0 ? undefined : backend,
    });
  }
  return (
    <FieldSet>
      <Legend>{t.backend}</Legend>
      <p sx={fonts.description}>{t.backendDescription}</p>

      <div sx={styles.field}>
        <span sx={styles.fieldLabel}>{t.contentBackend}</span>
        <ProviderSelect
          emptyLabel={t.notConfigured}
          onValueChange={(v) => setBackend("content", v)}
          options={CONTENT_PROVIDERS}
          value={contentBackend}
        />
      </div>

      <div sx={styles.field}>
        <span sx={styles.fieldLabel}>{t.mediaBackend}</span>
        <ProviderSelect
          emptyLabel={t.notConfigured}
          onValueChange={(v) => setBackend("media", v)}
          options={MEDIA_PROVIDERS}
          value={mediaBackend}
        />
      </div>
    </FieldSet>
  );
}
function ProviderSelect({
  emptyLabel,
  onValueChange,
  options,
  value,
}: {
  emptyLabel: LocalizedReactNode;
  onValueChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  const items: Record<string, LocalizedReactNode> = {
    [NONE]: emptyLabel,
    ...Object.fromEntries(options.map((o) => [o, o])),
  };

  return (
    <SelectRoot
      items={items}
      onValueChange={(v) => onValueChange(v as string)}
      value={value}
    >
      <SelectTrigger>
        <SelectValue>{(v: string) => items[v] ?? emptyLabel}</SelectValue>
        <SelectIcon />
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner
          alignItemWithTrigger={false}
          {...stylex.props(styles.positioner)}
          sideOffset={4}
        >
          <SelectPopup>
            {Object.entries(items).map(([code, label]) => (
              <SelectItem key={code} value={code}>
                <SelectItemText>{label}</SelectItemText>
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}
