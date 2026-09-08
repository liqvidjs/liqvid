"use client";

import type { Locale } from "@liqvid/schemas";
import { CaretUpDownIcon, CheckIcon, SpinnerIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { colors, radii, spacing } from "#_/design/tokens.stylex.js";
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

const settingsSpin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  check: {
    color: colors.accentSolid,
  },

  flag: {
    fontSize: "1.25rem",
    lineHeight: 1,
  },

  item: {
    alignItems: "center",
    background: {
      ":hover": colors.grayHover,
      default: null,
    },
    borderRadius: radii.lg,
    color: colors.grayNormal,
    cursor: "pointer",
    display: "flex",
    gap: spacing.lg,
    outline: "none",
    padding: `${spacing.md} ${spacing.lg}`,
  },

  itemSelected: {
    background: "var(--accent-ui)",
  },

  name: {
    flex: "1",
  },

  optionLabel: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
  },

  spinner: {
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationName: settingsSpin,
    animationTimingFunction: "linear",
    color: colors.grayDim,
    flexShrink: 0,
  },

  triggerDisabled: {
    cursor: "default",
    opacity: 0.6,
  },
});

/**
 * Supported UI locales, shown with their native names and a Unicode flag.
 * Names are intentionally left untranslated (displayed in their own language).
 */
const LOCALES: { code: Locale; flag: string; name: string }[] = [
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", name: "English" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", name: "Français" },
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", name: "Español" },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", name: "Deutsch" },
  { code: "zh", flag: "\u{1F1E8}\u{1F1F3}", name: "中文" },
];

/** Item map for `<SelectRoot items>` (value → label). */
const LOCALES_ITEMS: Record<string, string> = Object.fromEntries(
  LOCALES.map(({ code, name }) => [code, name]),
);

/** @package */
export function ConfigureLocaleClient({
  locale: initialLocale,
}: {
  locale: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [saving, setSaving] = useState<Locale | null>(null);

  async function selectLocale(next: Locale) {
    if (next === locale || saving) return;

    setSaving(next);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.settings.setLocale({
          payload: { locale: next },
        });
      }),
    );

    setSaving(null);

    if (Exit.isSuccess(result)) {
      setLocale(result.value.locale);
      // Reload so server-rendered translations reflect the new locale.
      window.location.reload();
    } else {
      console.error("Failed to update locale:", result.cause);
    }
  }

  return (
    <SelectRoot
      disabled={saving !== null}
      items={LOCALES_ITEMS}
      onValueChange={(value) => selectLocale(value as Locale)}
      value={locale}
    >
      <SelectTrigger>
        <SelectValue>
          {(value: Locale) => {
            const selected = LOCALES.find((l) => l.code === value);
            return selected ? (
              <span {...stylex.props(styles.optionLabel)}>
                <span aria-hidden {...stylex.props(styles.flag)}>
                  {selected.flag}
                </span>
                {selected.name}
              </span>
            ) : null;
          }}
        </SelectValue>
        {saving !== null ? (
          <SpinnerIcon {...stylex.props(styles.spinner)} weight="bold" />
        ) : (
          <SelectIcon>
            <CaretUpDownIcon />
          </SelectIcon>
        )}
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner alignItemWithTrigger={false} sideOffset={4}>
          <SelectPopup>
            {LOCALES.map(({ code, flag, name }) => (
              <SelectItem
                {...stylex.props(styles.item)}
                key={code}
                value={code}
              >
                <span aria-hidden {...stylex.props(styles.flag)}>
                  {flag}
                </span>
                <SelectItemText {...stylex.props(styles.name)}>
                  {name}
                </SelectItemText>
                <SelectItemIndicator {...stylex.props(styles.check)}>
                  <CheckIcon weight="bold" />
                </SelectItemIndicator>
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}
