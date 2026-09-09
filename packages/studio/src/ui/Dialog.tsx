"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Dialog } from "@base-ui/react/dialog";
import { useColorScheme } from "@liqvid/color-scheme/react";
import { XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type React from "react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { themed } from "#_/design/themed.js";
import {
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";

import { useCommonTranslations } from "../utils/react";

const styles = stylex.create({
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
    backgroundColor: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: radii.xl,
    borderStyle: "solid",
    borderWidth: dims.sep,
    boxShadow: shadows.lg,
    color: colors.grayNormal,
    left: "50%",
    maxWidth: "28rem",
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
    margin: spacing.zero,
  },
});

// api
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

const DialogApiContext = createContext<DialogApi>({
  close() {},
  isDialog: false,
  isOpen: false,
  level: 0,
});
DialogApiContext.displayName = "DialogApi";
export function useDialogApi() {
  return useContext(DialogApiContext);
}

interface DialogRootProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function DialogRoot({
  children,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
}: DialogRootProps) {
  // open state
  const [open, setOpen] = useState(defaultOpen);

  const parent = useDialogApi();

  /** setOpen() wrapper which updates ancestor dropdown */
  const wrappedOnOpenChange = useCallback(
    (newOpen: boolean) => {
      (onOpenChange ?? setOpen)(newOpen);
    },
    [onOpenChange],
  );

  // api
  const dialogApi = useMemo(
    () => ({
      close() {
        setOpen(false);
      },
      isDialog: true,
      get isOpen() {
        return controlledOpen ?? open;
      },
      level: parent.level + 1,
    }),
    [controlledOpen, open, parent.level],
  );

  return (
    <Dialog.Root
      modal
      onOpenChange={wrappedOnOpenChange}
      open={controlledOpen ?? open}
    >
      <DialogApiContext.Provider value={dialogApi}>
        {children}
      </DialogApiContext.Provider>
    </Dialog.Root>
  );
}

export function DialogClose({
  style,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Close>, "style"> & {
  style?: stylex.StyleXStyles;
}) {
  const c = useCommonTranslations();

  return (
    <Dialog.Close
      aria-label={children ? undefined : c.close}
      {...props}
      {...stylex.props(styles.close, style)}
    >
      {children ?? <XIcon size={24} />}
    </Dialog.Close>
  );
}

export function DialogPopup({
  style,
  size = "auto",
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Popup>, "style"> & {
  size?: "auto" | "small" | "medium" | "large" | "huge";
  style?: stylex.StyleXStyles;
}) {
  const { colorScheme } = useColorScheme();
  const { level } = useDialogApi();

  const sizeStyle =
    size !== "auto"
      ? styles[size as "small" | "medium" | "large" | "huge"]
      : undefined;

  const sx = stylex.props(styles.content, sizeStyle, style);

  return (
    <Dialog.Popup
      data-color-scheme={colorScheme}
      {...props}
      className={sx.className}
      style={{
        ...sx.style,
        "--dialog-level": `${level}`,
        colorScheme,
      }}
    />
  );
}

export const DialogPortal = Dialog.Portal;

export const DialogBackdrop = themed(Dialog.Backdrop, styles.backdrop);

export const DialogTitle = themed(Dialog.Title, styles.title);

export const DialogTrigger = Dialog.Trigger;
