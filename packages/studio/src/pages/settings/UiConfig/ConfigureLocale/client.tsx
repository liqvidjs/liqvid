"use client";

import type { Locale } from "@liqvid/schemas";
import * as stylex from "@stylexjs/stylex";
import { Effect, Exit } from "effect";
import { useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Spinner } from "#_/components/Spinner.js";
import { colors, spacing, text } from "#_/design/tokens.stylex.js";
import { PlainString } from "#_/i18n/shared.mjs";
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

export const styles = stylex.create({
  check: {
    color: colors.accentSolid,
  },

  flag: {
    fontSize: text.lg,
    lineHeight: 1,
  },

  name: {
    flex: "1",
  },

  optionLabel: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
  },
});

/**
 * Supported UI locales, shown with their native names and a Unicode flag.
 * Names are intentionally left untranslated (displayed in their own language).
 */
const LOCALES: { code: Locale; flag: string; name: PlainString }[] = [
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", name: PlainString("English") },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", name: PlainString("Français") },
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", name: PlainString("Español") },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", name: PlainString("Deutsch") },
  { code: "zh", flag: "\u{1F1E8}\u{1F1F3}", name: PlainString("中文") },
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
              <span sx={styles.optionLabel}>
                <span aria-hidden sx={styles.flag}>
                  {selected.flag}
                </span>
                {selected.name}
              </span>
            ) : null;
          }}
        </SelectValue>
        {saving !== null ? <Spinner /> : <SelectIcon />}
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner alignItemWithTrigger={false} sideOffset={4}>
          <SelectPopup>
            {LOCALES.map(({ code, flag, name }) => (
              <SelectItem key={code} value={code}>
                <span aria-hidden sx={styles.flag}>
                  {flag}
                </span>
                <SelectItemText>{name}</SelectItemText>
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}
