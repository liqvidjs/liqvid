"use client";

import { type StringValueConfig, usePersistentState } from "@liqvid/hydration";
import { makeContext } from "@liqvid/utils";
import { useCallback, useMemo } from "react";

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
  from,
}: {
  children?: React.ReactNode;
  from?: StringValueConfig<ColorScheme>;
}) {
  const [colorScheme, setColorScheme] = usePersistentState(from!, {
    disabled: !from,
  });

  const toggleColorScheme = useCallback(
    () => setColorScheme((prev) => (prev === "light" ? "dark" : "light")),
    [setColorScheme],
  );

  const context = useMemo(
    () => ({
      colorScheme,
      persistence: from,
      setColorScheme,
      toggleColorScheme,
    }),
    [colorScheme, from, toggleColorScheme, setColorScheme],
  );

  return (
    <colorSchemeContext.Provider value={context}>
      {children}
    </colorSchemeContext.Provider>
  );
}

/** access the color scheme API */
export const useColorScheme = colorSchemeContext.use;
