"use client";

import { useColorScheme } from "@liqvid/color-scheme/react";
import type { ShortcutsSpecifier } from "@liqvid/keymap";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { onClickReact, onDragReact, useToggle } from "@liqvid/utils";
import { XIcon } from "@phosphor-icons/react";
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
  rounded,
  scales,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex";
import type { LocalizedReactNode } from "#_/i18n/shared";
import { useCommonTranslations } from "#_/utils/react";

const styles = stylex.create({
  closeButton: {
    appearance: "none",
    backgroundColor: {
      ":active": scales.red600,
      ":hover": scales.red400,
      default: scales.red500,
    },
    borderRadius: rounded.md,
    borderStyle: "none",
    color: colors.white,
    cursor: "pointer",
    display: "flex",
    marginInlineStart: spacing.md,
    paddingBlock: spacing.xs,
    paddingInline: spacing.xs,
  },
  content: {
    backgroundColor: colors.dockablePanelBg,
    borderRadius: `0 0 ${rounded.md} ${rounded.md}`,
    color: colors.foreground,
    paddingBlock: spacing.lg,
    paddingInline: spacing.xl,
  },

  dialog: {
    boxShadow: shadows.xxl,
    display: "flex",
    flexDirection: "column",
    position: "absolute",
  },

  header: {
    alignItems: "center",
    backgroundColor: colors.accentSolid,
    borderTopLeftRadius: rounded.md,
    borderTopRightRadius: rounded.md,
    color: colors.white,
    display: "flex",
    fontSize: text.md,
    fontWeight: "bold",
    justifyContent: "space-between",
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
    userSelect: "none",
  },
});

const sizes = stylex.create({
  medium: {
    minWidth: 500,
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
  closeOnEscape,
  name,
  shortcut,
}: {
  children?: LocalizedReactNode;
  closeOnEscape?: boolean;
  name?: string;
  shortcut?: ShortcutsSpecifier;
}) {
  const { value: open, set: setOpen, toggle } = useToggle();

  useKeyboardShortcut(shortcut, (e) => {
    e.preventDefault();
    toggle();
  });

  useKeyboardShortcut("Escape", (e) => {
    if (!closeOnEscape) return;
    e.preventDefault();
    setOpen(false);
  });

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

function Close({
  children,
  onClick,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style">) {
  const { setOpen } = useDockableDialogState();
  const t = useCommonTranslations();

  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is special
    <button
      aria-label={children ? undefined : t.close}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
      sx={styles.closeButton}
      type="button"
      {...props}
    >
      {children ?? <XIcon size={16} weight="bold" />}
    </button>
  );
}

function Content({
  asChild = false,
  className,
  size = "medium",
  ...props
}: {
  asChild?: boolean;
  children?: LocalizedReactNode;
  size?: "auto" | "medium";
} & React.HTMLAttributes<HTMLElement>) {
  const Component = asChild ? Slot : "div";
  const sx = stylex.props([styles.content, sizes[size]]);

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
  Close,
  Content,
  Dialog,
  Header,
  Root,
  Trigger,
};
