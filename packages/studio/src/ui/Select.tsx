"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Select } from "@base-ui/react/select";
import clsx from "clsx";

import styles from "./Select.module.css";

export function SelectBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof Select.Backdrop>) {
  return (
    <Select.Backdrop className={clsx(styles.Backdrop, className)} {...props} />
  );
}

export function SelectIcon({
  className,
  ...props
}: React.ComponentProps<typeof Select.Icon>) {
  return <Select.Icon className={clsx(styles.Icon, className)} {...props} />;
}

export function SelectItem({
  className,
  ...props
}: React.ComponentProps<typeof Select.Item>) {
  return <Select.Item className={clsx(styles.Item, className)} {...props} />;
}

export function SelectItemIndicator({
  className,
  ...props
}: React.ComponentProps<typeof Select.ItemIndicator>) {
  return (
    <Select.ItemIndicator
      className={clsx(styles.ItemIndicator, className)}
      {...props}
    />
  );
}

export function SelectList({
  className,
  ...props
}: React.ComponentProps<typeof Select.List>) {
  return <Select.List className={clsx(styles.List, className)} {...props} />;
}

export function SelectPopup({
  className,
  ...props
}: React.ComponentProps<typeof Select.Popup>) {
  return <Select.Popup className={clsx(styles.Popup, className)} {...props} />;
}

export function SelectPortal(
  props: React.ComponentProps<typeof Select.Portal>,
) {
  return <Select.Portal {...props} />;
}

export function SelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Select.Trigger>) {
  return (
    <Select.Trigger className={clsx(styles.Trigger, className)} {...props} />
  );
}
