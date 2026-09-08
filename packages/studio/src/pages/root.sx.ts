import * as stylex from "@stylexjs/stylex";

import { colors, radii } from "#_/design/tokens.stylex.js";

/**
 * Shared form/dialog styles used across page components (NewProjectButton,
 * MediaDialog, ScreenshotsSection, RendersSection, CaptionsSection, etc.)
 */

export const form = stylex.create({
  dialogActions: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    marginTop: "0.5rem",
  },
  dialogForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  error: {
    backgroundColor: colors.errorSubtle,
    borderColor: "light-dark(#fecaca, #7f1d1d)",
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: "1px",
    color: colors.errorText,
    fontSize: "0.875rem",
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
  },
  fieldError: {
    color: colors.errorText,
    fontSize: "0.75rem",
  },
  fieldHint: {
    color: colors.grayDim,
    fontSize: "0.75rem",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: {
      ":hover:not(:disabled)": colors.accentSolidHover,
      default: colors.accentSolid,
    },
    borderRadius: radii.md,
    borderStyle: "none",
    color: "#fff",
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "flex",
    fontSize: "0.875rem",
    fontWeight: 500,
    gap: "0.2em",
    opacity: {
      ":disabled": 0.6,
    },
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
    transition: "background-color 0.15s",
  },
});
