import type { ColorSchemeSpecifier } from "@liqvid/color-scheme/react";

export const colorSchemeSpecifierToCss = (colorScheme: ColorSchemeSpecifier) =>
  colorScheme === "system" ? "light dark" : colorScheme;
