"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Dialog } from "@base-ui/react/dialog";
import { useColorScheme } from "@liqvid/color-scheme/react";
import { XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type React from "react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import { themed } from "#_/design/themed.js";
import { useCommonTranslations } from "#_/utils/react.js";

import {
  DialogApiContext,
  dialogStyles as styles,
  useDialogApi,
} from "./dialogs-shared.ts";

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
}: Omit<React.ComponentProps<typeof Dialog.Popup>, "className" | "style"> & {
  className?: {
    __error: "this component does not support customization";
  };
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
