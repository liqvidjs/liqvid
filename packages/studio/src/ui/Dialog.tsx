"use client";

import { Dialog } from "@base-ui/react/dialog";
import classNames from "classnames";
import type { ReactElement, ReactNode } from "react";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
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

interface DialogCloseProps
  extends Omit<React.ComponentProps<typeof Dialog.Close>, "render"> {
  asChild?: boolean;
}

export function DialogClose({
  asChild,
  children,
  className,
  ...props
}: DialogCloseProps) {
  const combinedClassName = classNames(styles.Close, className);

  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Close
        {...props}
        render={(renderProps) => {
          const child = Children.only(children) as ReactElement<{
            className?: string;
          }>;
          return cloneElement(child, {
            ...renderProps,
            className: classNames(combinedClassName, child.props.className),
          });
        }}
      />
    );
  }

  return (
    <Dialog.Close className={combinedClassName} {...props}>
      {children}
    </Dialog.Close>
  );
}

export function DialogContent({
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

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Backdrop>) {
  return (
    <Dialog.Backdrop
      className={classNames(styles.Overlay, className)}
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

interface DialogTriggerProps
  extends Omit<React.ComponentProps<typeof Dialog.Trigger>, "render"> {
  asChild?: boolean;
}

export function DialogTrigger({
  asChild,
  children,
  className,
  ...props
}: DialogTriggerProps) {
  const combinedClassName = classNames(styles.Trigger, className);

  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Trigger
        {...props}
        render={(renderProps) => {
          const child = Children.only(children) as ReactElement<{
            className?: string;
          }>;
          return cloneElement(child, {
            ...renderProps,
            className: classNames(combinedClassName, child.props.className),
          });
        }}
      />
    );
  }

  return (
    <Dialog.Trigger className={combinedClassName} {...props}>
      {children}
    </Dialog.Trigger>
  );
}
