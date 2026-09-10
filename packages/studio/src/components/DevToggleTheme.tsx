"use client";
import { KeymapProvider, useKeyboardShortcut } from "@liqvid/keymap/react";

export function DevToggleTheme() {
  return (
    <KeymapProvider>
      <Toggle />
    </KeymapProvider>
  );
}

function Toggle() {
  useKeyboardShortcut("Meta+'", () => {
    const { colorScheme } = document.documentElement.style;

    document.documentElement.style.colorScheme =
      colorScheme === "light" ? "dark" : "light";
  });
  return null;
}
