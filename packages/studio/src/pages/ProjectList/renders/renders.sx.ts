import * as stylex from "@stylexjs/stylex";

import { colors, radii, spacing } from "#_/design/tokens.stylex.js";

export const rendersStyles = stylex.create({
  dimensionInput: {
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: "1px",
    color: colors.grayNormal,
    fontSize: "0.875rem",
    outline: {
      ":focus": "none",
    },
    padding: "0.5rem",
    textAlign: "center",
    width: "5rem",
  },
  dimensionInputs: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },
  dimensionSeparator: {
    color: colors.grayDim,
    fontSize: "1rem",
  },
  lockButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: "1px",
    color: colors.grayDim,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    padding: spacing.sm,
    transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
  },
  lockButtonActive: {
    backgroundColor: colors.accentSolid,
    borderColor: colors.accentSolid,
    color: "#fff",
  },
  videoDialog: {
    maxWidth: "80vw",
    width: "auto",
  },
  videoHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  videoPlayer: {
    backgroundColor: "#000",
    borderRadius: radii.lg,
    display: "block",
    maxHeight: "70vh",
    maxWidth: "100%",
  },
});
