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
  evenRow: {
    background: colors.graySubtle,
  },

  kbd: {
    background: colors.graySubtle,
    borderBottomWidth: "2px",
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    display: "inline-block",
    fontFamily: typeface.uiMono,
    fontSize: text.em085,
    lineHeight: 1.4,
    minWidth: "1.2em",
    paddingBlock: spacing.em01,
    paddingInline: spacing.em045,
    textAlign: "center",
  },

  keys: {
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  plus: {
    color: colors.grayDim,
  },
  popup: {
    columnGap: "1rem",
    display: "flex",
    flexDirection: "column",
    maxWidth: "32rem",
    overflow: "auto",
    rowGap: "1rem",
  },

  table: {
    borderCollapse: "collapse",
    fontSize: text.rem0875,
    width: "100%",
  },

  td: {
    paddingBlock: spacing.rem04,
    paddingInline: spacing.rem06,
    textAlign: "left",
  },

  th: {
    borderBottomColor: colors.graySep,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    fontWeight: 600,
    paddingBlock: spacing.rem04,
    paddingInline: spacing.rem06,
    textAlign: "left",
  },
});
