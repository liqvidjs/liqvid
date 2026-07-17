"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Dialog } from "@base-ui/react/dialog";
import { useColorScheme } from "@liqvid/color-scheme/react";
import { XIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import styles from "./Dialog.module.css";

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
  className,
  children = <XIcon size={24} />,
  ...props
}: React.ComponentProps<typeof Dialog.Close>) {
  return (
    <Dialog.Close className={clsx(styles.Close, className)} {...props}>
      {children}
    </Dialog.Close>
  );
}

export function DialogPopup({
  className,
  size = "medium",
  ...props
}: React.ComponentProps<typeof Dialog.Popup> & {
  size?: "small" | "medium" | "large" | "huge";
}) {
  const { level } = useDialogApi();
  const { colorScheme } = useColorScheme();

  return (
    <Dialog.Popup
      className={clsx(styles.Content, styles[size], className)}
      data-color-scheme={colorScheme}
      style={{ colorScheme, zIndex: 20 * level }}
      {...props}
    />
  );
}

export function DialogPortal(
  props: React.ComponentProps<typeof Dialog.Portal>,
) {
  return <Dialog.Portal {...props} />;
}

export function DialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Backdrop>) {
  return (
    <Dialog.Backdrop className={clsx(styles.Backdrop, className)} {...props} />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title className={clsx(styles.Title, className)} {...props} />;
}

export function DialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Trigger>) {
  return (
    <Dialog.Trigger className={clsx(styles.Trigger, className)} {...props} />
  );
}
