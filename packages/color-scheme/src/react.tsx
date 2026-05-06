"use client";

import { type StringValueConfig, usePersistentState } from "@liqvid/hydration";
import { makeContext } from "@liqvid/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ColorScheme = "light" | "dark";
export type ColorSchemeSpecifier = ColorScheme | "system";

type Updater<T> = T | ((prev: T) => T);

export interface ColorSchemeContext {
  colorScheme: ColorScheme;
  persistence?: StringValueConfig<ColorScheme>;
  toggleColorScheme: () => void;
  setColorScheme: (update: Updater<ColorScheme>) => void;
}

const colorSchemeContext = makeContext<ColorSchemeContext>({
  defaultValue: {
    colorScheme: "light",
    setColorScheme() {},
    toggleColorScheme() {},
  },
  name: "ColorScheme",
  uniqueKey: "@liqvid/color-scheme",
});

/** provide color scheme to descendants */
export function ColorSchemeProvider({
  children,
  persistence,
  value,
}: {
  children?: React.ReactNode;
  persistence?: StringValueConfig<ColorScheme>;
  value?: ColorScheme;
}) {
  const [colorScheme, setColorScheme] = usePersistentState(persistence!, {
    default: value ?? "light",
    disabled: !persistence,
  });

  const toggleColorScheme = useCallback(
    () => setColorScheme((prev) => (prev === "light" ? "dark" : "light")),
    [setColorScheme],
  );

  const context = useMemo(
    () => ({
      colorScheme: value ?? colorScheme,
      persistence: persistence,
      setColorScheme,
      toggleColorScheme,
    }),
    [colorScheme, persistence, toggleColorScheme, setColorScheme, value],
  );

  return (
    <colorSchemeContext.Provider value={context}>
      {children}
    </colorSchemeContext.Provider>
  );
}

/** access the color scheme API */
export const useColorScheme = colorSchemeContext.use;

/**
 * Adds a `<meta name="color-scheme">` tag to `<head>` and keeps it in sync.
 * This is useful if you need transparent iframes in dark mode (https://github.com/w3c/csswg-drafts/issues/4772).
 */
export function ColorSchemeMetaTag() {
  const { colorScheme } = useColorScheme();
  const initialColorScheme = useRef(colorScheme);
  const meta = useRef<HTMLMetaElement>(null);

  useEffect(() => {
    meta.current = document.createElement("meta");
    meta.current.setAttribute("name", "color-scheme");
    meta.current.setAttribute("content", initialColorScheme.current);

    document.head.appendChild(meta.current);

    return () => {
      meta.current?.remove();
    };
  }, []);

  useEffect(() => {
    meta.current?.setAttribute("content", colorScheme);
  }, [colorScheme]);

  return null;
}
