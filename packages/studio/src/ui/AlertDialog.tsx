"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { AlertDialog } from "@base-ui/react/alert-dialog";
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

interface AlertDialogRootProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function AlertDialogRoot({
  children,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
}: AlertDialogRootProps) {
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
    <AlertDialog.Root
      onOpenChange={wrappedOnOpenChange}
      open={controlledOpen ?? open}
    >
      <DialogApiContext.Provider value={dialogApi}>
        {children}
      </DialogApiContext.Provider>
    </AlertDialog.Root>
  );
}

export function AlertDialogClose({
  style,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AlertDialog.Close>, "style"> & {
  style?: stylex.StyleXStyles;
}) {
  const c = useCommonTranslations();

  return (
    <AlertDialog.Close
      aria-label={children ? undefined : c.close}
      {...props}
      {...stylex.props(styles.close, style)}
    >
      {children ?? <XIcon size={24} />}
    </AlertDialog.Close>
  );
}

export function AlertDialogPopup({
  style,
  size = "auto",
  ...props
}: Omit<
  React.ComponentProps<typeof AlertDialog.Popup>,
  "className" | "style"
> & {
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
    <AlertDialog.Popup
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

export const AlertDialogPortal = AlertDialog.Portal;

export const AlertDialogBackdrop = themed(
  AlertDialog.Backdrop,
  styles.backdrop,
  "AlertDialogBackdrop",
);

export const AlertDialogTitle = themed(AlertDialog.Title, styles.title);

export const AlertDialogTrigger = AlertDialog.Trigger;
