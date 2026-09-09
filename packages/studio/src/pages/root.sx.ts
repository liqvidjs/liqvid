import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";

/**
 * Shared form/dialog styles used across page components (NewProjectButton,
 * MediaDialog, ScreenshotsSection, RendersSection, CaptionsSection, etc.)
 */

export const form = stylex.create({
  dialogActions: {
    columnGap: "0.75rem",
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "0.5rem",
    rowGap: "0.75rem",
  },
  dialogForm: {
    columnGap: "1.25rem",
    display: "flex",
    flexDirection: "column",
    rowGap: "1.25rem",
  },
  error: {
    backgroundColor: colors.errorSubtle,
    borderColor: colors.errorBorder,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.errorText,
    fontSize: text.rem0875,
    paddingBlock: spacing.rem05,
    paddingInline: spacing.rem075,
  },
  fieldError: {
    color: colors.errorText,
    fontSize: text.rem075,
  },
  fieldHint: {
    color: colors.grayDim,
    fontSize: text.rem075,
  },
  formField: {
    columnGap: "0.375rem",
    display: "flex",
    flexDirection: "column",
    rowGap: "0.375rem",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover:not(:disabled)": colors.accentSolidHover,
      default: colors.accentSolid,
    },
    borderRadius: radii.md,
    borderStyle: "none",
    color: colors.white,
    columnGap: "0.2em",
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.rem0875,
    fontWeight: 500,
    opacity: {
      ":disabled": 0.6,
    },
    paddingBlock: spacing.rem05,
    paddingInline: spacing.rem1,
    rowGap: "0.2em",
    transition: "background-color 0.15s",
  },
});
