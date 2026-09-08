"use client";

import { Menu } from "@base-ui/react/menu";
import * as stylex from "@stylexjs/stylex";
import clsx from "clsx";

import { dims, radii } from "#_/design/tokens.stylex.js";

import { useDialogApi } from "./Dialog";

import styles from "./Menu.module.css";

const newStyles = stylex.create({
  trigger: {
    alignItems: "center",
    background: "light-dark(#fff, #2a2a2a)",
    borderColor: {
      ":focus": "light-dark(#2563eb, #3b82f6)",
      default: "light-dark(#d1d5db, #4b5563)",
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    fontSize: "0.75rem",
    gap: "0.5rem",
    outline: {
      ":focus": "2px solid light-dark(#2563eb, #3b82f6)",
      default: null,
    },
    outlineOffset: {
      ":focus": "1px",
      default: null,
    },
    padding: "0.3em 0.5em",
  },
});

export function MenuRoot(props: React.ComponentProps<typeof Menu.Root>) {
  return <Menu.Root {...props} />;
}

export function MenuTrigger({
  style,
  ...props
}: Omit<React.ComponentProps<typeof Menu.Trigger>, "style"> & {
  style?: stylex.StyleXStyles;
}) {
  return (
    <Menu.Trigger {...props} {...stylex.props(newStyles.trigger, style)} />
  );
}

export function MenuPortal(props: React.ComponentProps<typeof Menu.Portal>) {
  return <Menu.Portal {...props} />;
}

export function MenuPositioner({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Menu.Positioner>) {
  const { level } = useDialogApi();
  return (
    <Menu.Positioner
      className={clsx(styles.Positioner, className)}
      {...props}
      style={{ "--dialog-level": `${level}` }}
    />
  );
}

export function MenuPopup({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Popup>) {
  return <Menu.Popup className={clsx(styles.Popup, className)} {...props} />;
}

export function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={clsx(styles.Item, className)} {...props} />;
}

export function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator className={clsx(styles.Separator, className)} {...props} />
  );
}
