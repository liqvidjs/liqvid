"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Select } from "@base-ui/react/select";
import clsx from "clsx";

import styles from "./Select.module.css";

export const SelectBackdrop = Select.Backdrop;
export const SelectItemText = Select.ItemText;
export const SelectPopup = Select.Popup;
export const SelectPortal = Select.Portal;
export const SelectPositioner = Select.Positioner;
export const SelectRoot = Select.Root;
export const SelectValue = Select.Value;

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

export function SelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Select.Trigger>) {
  return (
    <Select.Trigger className={clsx(styles.Trigger, className)} {...props} />
  );
}
