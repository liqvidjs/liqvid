"use client";

import { useColorScheme } from "@liqvid/color-scheme/react";
import type { ShortcutsSpecifier } from "@liqvid/keymap";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { onClickReact, onDragReact, useToggle } from "@liqvid/utils";
import { Portal } from "@radix-ui/react-portal";
import * as stylex from "@stylexjs/stylex";
import clsx from "clsx";
import { Option, Schema } from "effect";
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

import {
  colors,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";
import type { LocalizedReactNode } from "#_/i18n/shared.mjs";

const styles = stylex.create({
  content: {
    backgroundColor: colors.dockablePanelBg,
    borderRadius: `0 0 ${radii.md} ${radii.md}`,
    color: colors.foreground,
    paddingBlock: spacing.lg,
    paddingInline: spacing.xl,
  },
  dialog: {
    boxShadow: shadows.xxl,
    display: "flex",
    flexDirection: "column",
    position: "absolute",
    width: "500px",
  },
  header: {
    backgroundColor: colors.accentSolid,
    borderRadius: `${radii.md} ${radii.md} 0 0`,
    color: colors.white,
    fontSize: text.sm,
    fontWeight: "bold",
    paddingBlock: spacing.md,
    paddingInline: spacing.lg,
    userSelect: "none",
  },
});

/**
 * Merges props onto a single React child element.
 * Similar to Radix's Slot component.
 */
function Slot({
  children,
  className,
  ...props
}: { children?: LocalizedReactNode } & React.HTMLAttributes<HTMLElement>) {
  const child = Children.only(children);
  if (!isValidElement(child)) {
    return null;
  }
  const childProps = child.props as { className?: string };
  return cloneElement(
    child as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
    {
      ...props,
      className: clsx(className, childProps.className),
    },
  );
}

interface DockableDialogContextShape {
  name?: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
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
  children?: LocalizedReactNode;
  name?: string;
  shortcut?: ShortcutsSpecifier;
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
  children?: LocalizedReactNode;
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
  children?: LocalizedReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const Component = asChild ? Slot : "div";
  const sx = stylex.props(styles.content);

  return <Component className={clsx(sx.className, className)} {...props} />;
}

function Header({
  asChild = false,
  className,
  ...props
}: {
  asChild?: boolean;
  children?: LocalizedReactNode;
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
    const SavedCoordinates = Schema.TemplateLiteralParser([
      Schema.NumberFromString,
      " ",
      Schema.NumberFromString,
    ]);
    const savedRaw = window.sessionStorage.getItem(positionKey + name);
    if (savedRaw === null) return;

    const $saved = Schema.decodeUnknownOption(SavedCoordinates)(savedRaw);
    if (Option.isNone($saved)) return;

    // restore saved value
    const [savedX, , savedY] = $saved.value;
    Object.assign(parent.style, {
      translate: `${savedX}px ${savedY}px`,
    });
  }, [name]);

  const sx = stylex.props(styles.header);

  return (
    <Component
      className={clsx(sx.className, className)}
      ref={ref}
      {...events}
      {...props}
    />
  );
}

function Dialog({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { open } = useDockableDialogState();
  const { colorScheme } = useColorScheme();

  const sx = stylex.props(styles.dialog);

  return (
    <Portal>
      <aside
        className={clsx(sx.className, className)}
        hidden={!open}
        style={{
          ...sx.style,
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
