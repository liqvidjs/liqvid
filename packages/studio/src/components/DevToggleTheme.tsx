"use client";

import { useColorScheme } from "@liqvid/color-scheme/react";
import { KeymapProvider, useKeyboardShortcut } from "@liqvid/keymap/react";

export function DevToggleTheme() {
  return (
    <KeymapProvider>
      <Toggle />
    </KeymapProvider>
  );
}

function Toggle() {
  const { setColorScheme } = useColorScheme();

  useKeyboardShortcut("Meta+'", () => {
    const { colorScheme } = document.documentElement.style;

    const next = colorScheme === "light" ? "dark" : "light";

    document.documentElement.style.colorScheme = next;

    setColorScheme(next);
  });
  return null;
}
