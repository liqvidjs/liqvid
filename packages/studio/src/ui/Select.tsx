"use client";

// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Select } from "@base-ui/react/select";
import * as stylex from "@stylexjs/stylex";

import { extensible, themed } from "#_/design/themed.js";
import { colors, radii } from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  icon: {
    color: colors.grayDim,
    display: "flex",
  },
  item: {
    alignItems: "center",
    background: {
      ":focus": colors.grayHover,
      default: null,
    },
    borderRadius: "3px",
    color: colors.grayNormal,
    cursor: "pointer",
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    outline: {
      ":focus": "none",
      default: null,
    },
    paddingBlock: "0.5rem",
    paddingInline: "0.75rem",
    paddingRight: "2rem",
    position: "relative",
    userSelect: "none",
  },
  itemIndicator: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    position: "absolute",
    right: "0.5rem",
  },
  list: {
    padding: "0.25rem",
  },
  popup: {},
  trigger: {
    alignItems: "center",
    background: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: "1px",
    color: "inherit",
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    justifyContent: "space-between",
    outline: {
      ":focus": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus": "1px",
      default: null,
    },
    paddingBlock: "0.5rem",
    paddingInline: "0.75rem",
  },
});

export const SelectBackdrop = Select.Backdrop;
export const SelectIcon = themed(Select.Icon, styles.icon);
export const SelectItem = themed(Select.Item, styles.item);
export const SelectItemIndicator = extensible()(
  Select.ItemIndicator,
  styles.itemIndicator,
);
export const SelectItemText = Select.ItemText;
export const SelectList = themed(Select.List, styles.list);
export const SelectPopup = themed(Select.Popup, styles.popup);
export const SelectPortal = Select.Portal;
export const SelectPositioner = Select.Positioner;
export const SelectRoot = Select.Root;
export const SelectTrigger = extensible()(Select.Trigger, styles.trigger);
export const SelectValue = Select.Value;
