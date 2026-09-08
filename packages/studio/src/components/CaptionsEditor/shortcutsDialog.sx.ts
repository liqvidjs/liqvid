import * as stylex from "@stylexjs/stylex";

import { colors, radii } from "#_/design/tokens.stylex.js";

export const styles = stylex.create({
  evenRow: {
    background: colors.graySubtle,
  },

  kbd: {
    background: colors.graySubtle,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.graySep,
    borderBottomWidth: "2px",
    borderRadius: radii.md,
    color: colors.grayNormal,
    display: "inline-block",
    fontFamily: "ui-monospace, monospace",
    fontSize: "0.85em",
    lineHeight: 1.4,
    minWidth: "1.2em",
    paddingBlock: '0.1em',
    paddingInline: '0.45em',
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
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "32rem",
    overflow: "auto",
  },

  table: {
    borderCollapse: "collapse",
    fontSize: "0.875rem",
    width: "100%",
  },

  td: {
    paddingBlock: '0.4rem',
    paddingInline: '0.6rem',
    textAlign: "left",
  },

  th: {
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: colors.graySep,
    fontWeight: 600,
    paddingBlock: '0.4rem',
    paddingInline: '0.6rem',
    textAlign: "left",
  },
});
