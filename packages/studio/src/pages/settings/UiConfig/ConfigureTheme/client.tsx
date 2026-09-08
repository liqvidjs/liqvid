"use client";

import {
  CaretUpDownIcon,
  CheckIcon,
  DesktopIcon,
  MoonIcon,
  SpinnerIcon,
  SunIcon,
} from "@phosphor-icons/react";
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

type Theme = "light" | "dark" | "system";

const settingsSpin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  check: {
    color: colors.accentSolid,
  },

  icon: {
    flexShrink: 0,
    fontSize: "1.125rem",
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
});

const THEMES: { code: Theme; icon: React.ReactNode; name: string }[] = [
  {
    code: "system",
    icon: <DesktopIcon weight="bold" />,
    name: "System",
  },
  {
    code: "light",
    icon: <SunIcon weight="bold" />,
    name: "Light",
  },
  {
    code: "dark",
    icon: <MoonIcon weight="bold" />,
    name: "Dark",
  },
];

/** Item map for `<SelectRoot items>` (value -> label). */
const THEMES_ITEMS: Record<string, string> = Object.fromEntries(
  THEMES.map(({ code, name }) => [code, name]),
);

/** @package */
export function ConfigureThemeClient({
  theme: initialTheme,
}: {
  theme: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [saving, setSaving] = useState<Theme | null>(null);

  async function selectTheme(next: Theme) {
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
      // Reload so the root layout reflects the new color scheme.
      window.location.reload();
    } else {
      console.error("Failed to update theme:", result.cause);
    }
  }

  return (
    <SelectRoot
      disabled={saving !== null}
      items={THEMES_ITEMS}
      onValueChange={(value) => selectTheme(value as Theme)}
      value={theme}
    >
      <SelectTrigger>
        <SelectValue>
          {(value: Theme) => {
            const selected = THEMES.find((t) => t.code === value);
            return selected ? (
              <span {...stylex.props(styles.optionLabel)}>
                <span {...stylex.props(styles.icon)}>{selected.icon}</span>
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
            {THEMES.map(({ code, icon, name }) => (
              <SelectItem
                {...stylex.props(styles.item)}
                key={code}
                value={code}
              >
                <span {...stylex.props(styles.icon)}>{icon}</span>
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
