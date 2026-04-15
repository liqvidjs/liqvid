"use client";

import { Dialog } from "@base-ui/react/dialog";
import classNames from "classnames";
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
}

const DialogApiContext = createContext<DialogApi>({
  close() {},
  isDialog: false,
  isOpen: false,
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
    }),
    [controlledOpen, open],
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
  ...props
}: React.ComponentProps<typeof Dialog.Close>) {
  return (
    <Dialog.Close className={classNames(styles.Close, className)} {...props} />
  );
}

export function DialogPopup({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Popup>) {
  return (
    <Dialog.Popup
      className={classNames(styles.Content, className)}
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
    <Dialog.Backdrop
      className={classNames(styles.Backdrop, className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title className={classNames(styles.Title, className)} {...props} />
  );
}

export function DialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Trigger>) {
  return (
    <Dialog.Trigger
      className={classNames(styles.Trigger, className)}
      {...props}
    />
  );
}
