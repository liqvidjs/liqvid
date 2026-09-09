"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Select } from "@base-ui/react/select";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { extensible, themed } from "#_/design/themed.js";
import {
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  icon: {
    color: colors.grayDim,
    display: "flex",
  },
  item: {
    alignItems: "center",
    backgroundColor: {
      ":focus": colors.grayActive,
      ":hover": colors.grayHover,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },
    color: colors.grayNormal,
    cursor: "pointer",
    display: "flex",
    fontSize: text.sm,
    gap: spacing.md,
    outline: {
      ":focus": "none",
      default: null,
    },
    paddingBlock: spacing.md,
    paddingInline: spacing.lg,
    position: "relative",
    userSelect: "none",
  },
  itemIndicator: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  itemText: {},
  list: {},
  popup: {
    backgroundColor: colors.grayApp,
    borderRadius: radii.lg,
    boxShadow: shadows.md,
  },
  trigger: {
    alignItems: "center",
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.inherit,
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.base,
    gap: spacing.lg,
    justifyContent: "space-between",
    outline: {
      ":focus": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus": "1px",
      default: null,
    },
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    width: "max-content",
  },
});

export const SelectBackdrop = Select.Backdrop;
export const SelectItem = themed(Select.Item, styles.item);
export const SelectItemText = themed(Select.ItemText, styles.itemText);
export const SelectList = themed(Select.List, styles.list);
export const SelectPopup = themed(Select.Popup, styles.popup);
export const SelectPortal = Select.Portal;
export const SelectPositioner = Select.Positioner;
export const SelectRoot = Select.Root;
export const SelectTrigger = extensible()(Select.Trigger, styles.trigger);
export const SelectValue = Select.Value;

export function SelectIcon(
  props: Omit<React.ComponentProps<typeof Select.Icon>, "children">,
) {
  return (
    <Select.Icon {...props} {...stylex.props(styles.icon)}>
      <CaretUpDownIcon />
    </Select.Icon>
  );
}

export function SelectItemIndicator(
  props: Omit<
    React.ComponentProps<typeof Select.ItemIndicator>,
    "className" | "children" | "style"
  > & {
    className?: never;
    children?: never;
  },
) {
  return (
    <Select.ItemIndicator {...props} {...stylex.props(styles.itemIndicator)}>
      <CheckIcon />
    </Select.ItemIndicator>
  );
}
