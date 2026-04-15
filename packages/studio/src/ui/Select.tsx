"use client";

import { Select } from "@base-ui/react/select";
import classNames from "classnames";

import styles from "./Select.module.css";

export function SelectClose({
  className,
  ...props
}: React.ComponentProps<typeof Select.Close>) {
  return (
    <Select.Close className={classNames(styles.Close, className)} {...props} />
  );
}

export function SelectPopup({
  className,
  ...props
}: React.ComponentProps<typeof Select.Popup>) {
  return (
    <Select.Popup className={classNames(styles.Popup, className)} {...props} />
  );
}

export function SelectPortal(
  props: React.ComponentProps<typeof Select.Portal>,
) {
  return <Select.Portal {...props} />;
}

export function SelectBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof Select.Backdrop>) {
  return (
    <Select.Backdrop
      className={classNames(styles.Backdrop, className)}
      {...props}
    />
  );
}
export function SelectIcon({
  className,
  ...props
}: React.ComponentProps<typeof Select.Icon>) {
  return (
    <Select.Icon className={classNames(styles.Icon, className)} {...props} />
  );
}

export function SelectItem({
  className,
  ...props
}: React.ComponentProps<typeof Select.Item>) {
  return (
    <Select.Item className={classNames(styles.Item, className)} {...props} />
  );
}

export function SelectItemIndicator({
  className,
  ...props
}: React.ComponentProps<typeof Select.ItemIndicator>) {
  return (
    <Select.ItemIndicator
      className={classNames(styles.ItemIndicator, className)}
      {...props}
    />
  );
}

export function SelectList({
  className,
  ...props
}: React.ComponentProps<typeof Select.List>) {
  return (
    <Select.List className={classNames(styles.List, className)} {...props} />
  );
}

export function SelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Select.Trigger>) {
  return (
    <Select.Trigger
      className={classNames(styles.Trigger, className)}
      {...props}
    />
  );
}
