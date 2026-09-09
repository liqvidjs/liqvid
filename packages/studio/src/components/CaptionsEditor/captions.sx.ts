import * as stylex from "@stylexjs/stylex";

import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";

export const styles = stylex.create({
  actions: {
    alignItems: "center",
    columnGap: "0.5em",
    display: "flex",
    rowGap: "0.5em",
  },

  activeWord: {
    background: "transparent",
    borderRadius: radii.xs,
    color: colors.accentSolid,
  },
  CaptionsEditor: {
    height: "max-content",
    maxWidth: "unset",
    width: "max-content",
  },

  captionBreak: {
    "::after": {
      background: "gray",
      content: '""',
      display: "inline-block",
      height: "1em",
      verticalAlign: "middle",
      width: "1px",
    },
    position: "relative",
  },

  hoverWord: {
    background: "light-dark(rgba(0, 0, 0, 8%), rgba(255, 255, 255, 10%))",
    borderRadius: radii.sm,
    boxSizing: "content-box",
    paddingBlock: spacing.xs,
    paddingInline: spacing.sm,
    pointerEvents: "none",
    position: "absolute",
    translate: "-2px -1px",
    zIndex: 1,
  },

  preview: {
    background: "light-dark(#000d, #222d)",
    borderRadius: radii.xl,
    bottom: "10%",
    color: colors.white,
    left: "50%",
    paddingBlock: spacing.em04,
    paddingInline: spacing.em08,
    pointerEvents: "none",
    position: "absolute",
    translate: "-50% 0",
    width: "max-content",
    zIndex: 10,
  },

  selection: {
    "::before": {
      background: "light-dark(#acf, #79e)",
      borderRadius: radii.sm,
      boxSizing: "content-box",
      content: '""',
      height: "100%",
      left: 0,
      marginBlock: spacing.negXs,
      marginInline: spacing.negMd,
      paddingBlock: spacing.xs,
      paddingInline: spacing.md,
      position: "absolute",
      top: 0,
      width: "100%",
      zIndex: -1,
    },
    background: "light-dark(#acf, #79e)",
    color: colors.inherit,
    position: "relative",
    zIndex: 0,
  },

  stripes: {
    backgroundImage: `repeating-linear-gradient(light-dark(#f6f6f6, #333) 0,light-dark(#f6f6f6, #333) calc(1.5em - 1px),light-dark(#ddd, #4a4a4a) calc(1.5em - 1px),light-dark(#ddd, #4a4a4a) calc(1.5em),light-dark(#e8e8e8, #3f3f3f) calc(1.5em),light-dark(#e8e8e8, #3f3f3f) calc(3em - 1px),light-dark(#ddd, #4a4a4a) calc(3em - 1px),light-dark(#ddd, #4a4a4a) calc(3em))`,
    cursor: "pointer",
    paddingBlock: spacing.zero,
    paddingInline: spacing.md,
    position: "relative",
  },

  time: {
    color: colors.grayDim,
    fontFamily: typeface.mono,
    fontSize: text.em08,
    marginBlock: spacing.em05,
    marginInline: spacing.zero,
  },

  transcript: {
    borderColor: colors.graySep,
    borderRadius: radii.sm,
    borderStyle: "solid",
    borderWidth: dims.sep,
    height: "50vh",
    lineHeight: 1.5,
    marginBlock: spacing.em05,
    marginInline: spacing.zero,
    overflow: "auto",
    width: "75vw",
  },

  wordInput: {
    background: colors.grayApp,
    borderColor: colors.accentSolid,
    borderRadius: radii.sm,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.inherit,
    font: "inherit",
    minWidth: "4em",
    outline: "none",
    paddingBlock: spacing.xs,
    paddingInline: spacing.sm,
    position: "absolute",
    translate: "-2px -1px",
    zIndex: 2,
  },
});
