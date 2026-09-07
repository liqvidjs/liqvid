"use client";

import { Menu } from "@base-ui/react/menu";
import clsx from "clsx";

import { useDialogApi } from "./Dialog";

import styles from "./Menu.module.css";

export function MenuRoot(props: React.ComponentProps<typeof Menu.Root>) {
  return <Menu.Root {...props} />;
}

export function MenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Trigger>) {
  return (
    <Menu.Trigger className={clsx(styles.Trigger, className)} {...props} />
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
