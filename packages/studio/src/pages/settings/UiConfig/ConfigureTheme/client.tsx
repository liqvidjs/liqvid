"use client";

import type { ColorSchemeSpecifier } from "@liqvid/color-scheme/react";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Effect, Exit } from "effect";
import { useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Spinner } from "#_/components/Spinner.js";
import type { Localized, LocalizedReactNode } from "#_/i18n/shared.mjs";
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
} from "#_/ui/Select.js";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const THEMES: {
  value: ColorSchemeSpecifier;
  icon: LocalizedReactNode;
}[] = [
  {
    icon: <DesktopIcon weight="bold" />,
    value: "system",
  },
  {
    icon: <SunIcon weight="bold" />,
    value: "light",
  },
  {
    icon: <MoonIcon weight="bold" />,
    value: "dark",
  },
];

/** @package */
export function ConfigureThemeClient({
  theme: initialTheme,
  t,
}: {
  theme: ColorSchemeSpecifier;
  t: T;
}) {
  const [theme, setTheme] = useState<ColorSchemeSpecifier>(initialTheme);
  const [saving, setSaving] = useState<ColorSchemeSpecifier | null>(null);

  /** Item map for `<SelectRoot items>` (value -> label). */
  const THEMES_ITEMS = Object.fromEntries(
    THEMES.map(({ value: code }) => [code, t[code]]),
  );

  async function selectTheme(next: ColorSchemeSpecifier) {
    if (next === theme || saving) return;

    setSaving(next);

    const result = await clientRuntime.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;
        return yield* client.settings.setTheme({
          payload: { theme: next },
        });
      }),
    );

    setSaving(null);

    if (Exit.isSuccess(result)) {
      setTheme(result.value.theme);

      document.documentElement.style.colorScheme =
        result.value.theme === "system" ? "light dark" : result.value.theme;
    } else {
      console.error("Failed to update theme:", result.cause);
    }
  }

  return (
    <SelectRoot
      disabled={saving !== null}
      items={THEMES_ITEMS}
      onValueChange={(value) => selectTheme(value as ColorSchemeSpecifier)}
      value={theme}
    >
      <SelectTrigger>
        <SelectValue>
          {(value: ColorSchemeSpecifier) => {
            const selected = THEMES.find((t) => t.value === value);
            return selected ? (
              <>
                {selected.icon}
                {t[selected.value]}
              </>
            ) : null;
          }}
        </SelectValue>
        {saving !== null ? <Spinner /> : <SelectIcon />}
      </SelectTrigger>

      <SelectPortal>
        <SelectPositioner alignItemWithTrigger={false} sideOffset={4}>
          <SelectPopup>
            <SelectList>
              {THEMES.map(({ value: code, icon }) => (
                <SelectItem key={code} value={code}>
                  <span>{icon}</span>
                  <SelectItemText>{t[code]}</SelectItemText>
                  <SelectItemIndicator />
                </SelectItem>
              ))}
            </SelectList>
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </SelectRoot>
  );
}
