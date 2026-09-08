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

import { colors, radii } from "#_/design/tokens.stylex.js";

import { useCommonTranslations } from "../utils/react";

const PADDING = "1.5rem";

const styles = stylex.create({
  backdrop: {
    backgroundColor: "rgb(0 0 0 / 0.5)",
    inset: 0,
    position: "fixed",
  },
  close: {
    background: "unset",
    borderRadius: radii.md,
    color: {
      ":hover:not(:disabled)": "light-dark(#111827, #f9fafb)",
      default: "light-dark(#374151, #f3f4f6)",
    },
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    fontSize: "0.875rem",
    opacity: {
      ":disabled": 0.6,
      default: null,
    },
    position: "absolute",
    right: PADDING,
    top: PADDING,
    transition: "background-color 0.15s",
    width: "max-content",
  },
  content: {
    backgroundColor: colors.grayApp,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.graySep,
    borderRadius: radii.xl,
    boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    color: colors.grayNormal,
    left: "50%",
    maxWidth: "28rem",
    padding: PADDING,
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
    fontSize: "1.25rem",
    fontWeight: 600,
    margin: 0,
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

export function DialogPortal(
  props: React.ComponentProps<typeof Dialog.Portal>,
) {
  return <Dialog.Portal {...props} />;
}

export function DialogBackdrop(
  props: Omit<React.ComponentProps<typeof Dialog.Backdrop>, "className">,
) {
  return <Dialog.Backdrop {...props} {...stylex.props(styles.backdrop)} />;
}

export function DialogTitle(
  props: Omit<React.ComponentProps<typeof Dialog.Title>, "className">,
) {
  return <Dialog.Title {...props} {...stylex.props(styles.title)} />;
}

export const DialogTrigger = Dialog.Trigger;
