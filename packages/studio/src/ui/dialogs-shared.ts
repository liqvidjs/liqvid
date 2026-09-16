import * as stylex from "@stylexjs/stylex";
import { createContext, useContext } from "react";

import {
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";

interface DialogApi {
  /** Close the dialog. */
  close: () => unknown;

  /** Whether we are actually contained in a dialog. */
  isDialog: boolean;

  /** Whether the dialog is currently open */
  isOpen: boolean;

  /** The nesting level of the dialog. */
  level: number;
}

/** @package */
export const DialogApiContext = createContext<DialogApi>({
  close() {},
  isDialog: false,
  isOpen: false,
  level: 0,
});
DialogApiContext.displayName = "DialogApi";

export function useDialogApi() {
  return useContext(DialogApiContext);
}

/** @package */
export const dialogStyles = stylex.create({
  backdrop: {
    backgroundColor: colors.dialogBackdrop,
    inset: 0,
    position: "fixed",
  },
  close: {
    background: "unset",
    borderRadius: radii.md,
    color: {
      ":hover:not(:disabled)": colors.dialogCloseBgHover,
      default: colors.dialogCloseColor,
    },
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    fontSize: text.md,
    opacity: {
      ":disabled": 0.6,
      default: null,
    },
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
    transition: "background-color 0.15s",
    width: "max-content",
  },

  content: {
    backgroundColor: colors.surface,
    borderColor: colors.graySep,
    borderRadius: radii.xl,
    borderStyle: "solid",
    borderWidth: dims.sep,
    boxShadow: shadows.lg,
    color: colors.grayNormal,
    fontFamily: typeface.ui,
    left: "50%",
    maxWidth: "720px",
    overflow: "auto",
    padding: spacing.lg,
    position: "fixed",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "calc(100% - 2rem)",
  },
  huge: {
    height: "90vh",
  },
  large: {
    height: "75vh",
  },
  medium: {
    height: "50vh",
  },
  small: {
    height: "25vh",
  },
  title: {
    fontSize: text.lg,
    fontWeight: 600,
    marginBottom: spacing.lg,
  },
});
