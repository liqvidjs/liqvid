"use client";

import { type StringValueConfig, usePersist } from "@liqvid/hydration";
import { createUniqueContext } from "@liqvid/utils";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ColorScheme = "light" | "dark";
export type ColorSchemeSpecifier = ColorScheme | "system";

type Updater<T> = T | ((prev: T) => T);

const DEFAULT_COLOR_SCHEME = "light" satisfies ColorScheme;

export interface ColorSchemeContext {
  colorScheme: ColorScheme;
  persistence?: StringValueConfig<ColorScheme>;
  toggleColorScheme: () => void;
  setColorScheme: (update: Updater<ColorScheme>) => void;
}

const colorSchemeContext = createUniqueContext<ColorSchemeContext>(
  "@liqvid/color-scheme",
  {
    colorScheme: "light",
    setColorScheme() {},
    toggleColorScheme() {},
  },
);
colorSchemeContext.displayName = "ColorScheme";

export function ColorSchemeProvider({
  children,
  from,
}: {
  children?: React.ReactNode;
  from?: StringValueConfig<ColorScheme>;
}) {
  const [get, set] = usePersist(from!, { disabled: !from });
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    (from ? get() : undefined) ?? DEFAULT_COLOR_SCHEME,
  );

  useEffect(() => set(colorScheme), [colorScheme, set]);

  const toggleColorScheme = useCallback(
    () => setColorScheme((prev) => (prev === "light" ? "dark" : "light")),
    [],
  );

  const context = useMemo(
    () => ({
      colorScheme,
      persistence: from,
      setColorScheme,
      toggleColorScheme,
    }),
    [colorScheme, from, toggleColorScheme],
  );

  return (
    <colorSchemeContext.Provider value={context}>
      {children}
    </colorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorSchemeContext {
  return useContext(colorSchemeContext);
}
