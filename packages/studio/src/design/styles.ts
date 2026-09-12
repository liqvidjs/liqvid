/**
 * @file This file contains semantic styles, while
 */
import * as stylex from "@stylexjs/stylex";

import { themed } from "./themed.tsx";
import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "./tokens.stylex.ts";

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
  filenameInput: {
    fontFamily: typeface.mono,
  },
  ui: {
    fontFamily: typeface.ui,
    fontSize: text.base,
  },
  var: {
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.sm,
    borderStyle: "solid",
    borderWidth: dims.sep,
    fontFamily: typeface.mono,
    fontSize: text.sm,
    fontStyle: "normal",
    paddingBlock: spacing.xs,
    paddingInline: spacing.sm,
  },
});

const breathing = stylex.create({
  lg: {
    marginBottom: spacing.lg,
  },
});

export const typography = stylex.create({
  description: {
    color: colors.grayDim,
    fontFamily: typeface.ui,
    fontSize: text.md,
  },
  header1: {
    marginBottom: spacing.huge,
  },
  header3: {
    marginBottom: spacing.md,
  },
  heading1: {
    fontFamily: typeface.ui,
    fontSize: text.xl,
  },
});

export const Description = themed("p", [fonts.description, breathing.lg]);
