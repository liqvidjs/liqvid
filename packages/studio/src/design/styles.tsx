import * as stylex from "@stylexjs/stylex";

import { themed } from "./themed.tsx";
import { colors, spacing, text, typeface } from "./tokens.stylex.ts";

export const fonts = stylex.create({
  description: {
    color: colors.grayDim,
    fontFamily: typeface.ui,
    fontSize: text.md,
    marginBottom: spacing.lg,
  },
  filename: {
    fontFamily: typeface.mono,
    fontSize: text.sm,
  },
  ui: {
    fontFamily: typeface.ui,
    fontSize: text.base,
  },
});

export const breathing = stylex.create({
  lg: {
    marginBottom: spacing.lg,
  },
});

export const Description = themed("p", [fonts.description, breathing.lg]);
