"use client";

import { useColorScheme } from "@liqvid/color-scheme/react";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { onClickReact, onDragReact } from "@liqvid/utils";
import { Portal } from "@radix-ui/react-portal";
import classNames from "classnames";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { z } from "zod";

import { useToggle } from "../utils/react.mts";

import styles from "./DockableDialog.module.css";

/**
 * Merges props onto a single React child element.
 * Similar to Radix's Slot component.
 */
function Slot({
  children,
  className,
  ...props
}: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const child = Children.only(children);
  if (!isValidElement(child)) {
    return null;
  }
  const childProps = child.props as { className?: string };
  return cloneElement(
    child as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
    {
      ...props,
      className: classNames(className, childProps.className),
    },
  );
}

interface DockableDialogContextShape {
  name?: string;
  open: boolean;
  toggle: () => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const dockableDialogContext = createContext<DockableDialogContextShape>({
  open: false,
  setOpen() {},
  toggle() {},
});
dockableDialogContext.displayName = "DockableDialog";

function useDockableDialogState() {
  return useContext(dockableDialogContext);
}

const openKey = `lv-dockable-dialog-open.`;
const positionKey = `lv-dockable-dialog-position.`;

function Root({
  children,
  name,
  shortcut,
}: {
  children?: React.ReactNode;
  name?: string;
  shortcut?: string;
}) {
  const { value: open, set: setOpen, toggle } = useToggle();

  useKeyboardShortcut(shortcut, toggle);

  // persist open state
  useEffect(() => {
    if (!name) return;

    const sessionValue = window.sessionStorage.getItem(openKey + name);
    if (sessionValue === "true") setOpen(true);
  }, [name, setOpen]);

  useEffect(() => {
    if (!name) return;
    window.sessionStorage.setItem(openKey + name, String(open));
  }, [open, name]);

  // context value
  const context = useMemo(
    () => ({ name, open, setOpen, toggle }),
    [name, open, toggle, setOpen],
  );

  return (
    <dockableDialogContext.Provider value={context}>
      {children}
    </dockableDialogContext.Provider>
  );
}

function Trigger({
  asChild = false,
  children,
}: {
  asChild?: boolean;
  children?: React.ReactNode;
}) {
  const { toggle } = useDockableDialogState();
  const Component = asChild ? Slot : "button";

  const events = useMemo(() => onClickReact(toggle), [toggle]);

  return <Component {...events}>{children}</Component>;
}

function Content({
  asChild = false,
  className,
  ...props
}: {
  asChild?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const Component = asChild ? Slot : "div";

  return (
    <Component
      className={classNames(styles.DockableDialogContent, className)}
      {...props}
    />
  );
}

function Header({
  asChild = false,
  className,
  ...props
}: {
  asChild?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const { name } = useDockableDialogState();
  const Component = asChild ? Slot : "header";
  const ref = useRef<HTMLElement>(null);

  const offset = useRef<[number, number]>([0, 0]);

  const events = useMemo(
    () =>
      onDragReact(
        (_e, { x, y }) => {
          const parent = ref.current?.parentElement;
          if (!parent) return;
          const [offsetX, offsetY] = offset.current;

          Object.assign(parent.style, {
            translate: `${x + offsetX}px ${y + offsetY}px`,
          });
        },
        // down
        (_e, { x, y }) => {
          if (!ref.current) return;
          const rect = ref.current.getBoundingClientRect();
          offset.current = [rect.x - x, rect.y - y];
        },
        // up
        (_e, { x, y }) => {
          if (!name) return;
          window.sessionStorage.setItem(
            positionKey + name,
            `${offset.current[0] + x} ${offset.current[1] + y}`,
          );
        },
      ),
    [name],
  );

  useEffect(() => {
    if (!name) return;

    const parent = ref.current?.parentElement;
    if (!parent) return;

    // get saved value
    const SavedCoordinates = z
      .templateLiteral([z.number(), " ", z.number()])
      .transform(
        (arg) => arg.split(" ").map((x) => parseFloat(x)) as [number, number],
      );
    const savedRaw = window.sessionStorage.getItem(positionKey + name);
    const $saved = SavedCoordinates.safeParse(savedRaw);
    if (!$saved.success) return;

    // restore saved value
    const [savedX, savedY] = $saved.data;
    Object.assign(parent.style, {
      translate: `${savedX}px ${savedY}px`,
    });
  }, [name]);

  return (
    <Component
      className={classNames(styles.DockableDialogHeader, className)}
      ref={ref}
      {...events}
      {...props}
    />
  );
}

function Dialog({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { open } = useDockableDialogState();
  const { colorScheme } = useColorScheme();

  return (
    <Portal>
      <aside
        className={classNames(styles.DockableDialog, "shadow-lg", className)}
        hidden={!open}
        style={{
          colorScheme,
        }}
        {...props}
      />
    </Portal>
  );
}

export const DockableDialog = {
  Content,
  Dialog,
  Header,
  Portal,
  Root,
  Trigger,
};
