"use client";

import { Tabs } from "@base-ui/react/tabs";
import * as stylex from "@stylexjs/stylex";

import { themed } from "#_/design/themed";
import { colors, dims, rounded, spacing, text } from "#_/design/tokens.stylex";

const styles = stylex.create({
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.sep,
    borderRadius: rounded.sm,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    flexDirection: "column",
    width: "max-content",
  },

  panel: {},

  root: {
    display: "flex",
    gap: spacing.lg,
  },

  tab: {
    backgroundColor: {
      ":hover": colors.affordanceHover,
      "[aria-selected=true]": colors.grayActive,
      default: null,
    },
    fontSize: text.md,
    paddingBlock: spacing.md,
    paddingInline: spacing.lg,
  },
});

export const DrawerListRoot = themed(Tabs.Root, styles.root);

export const DrawerListItems = themed(Tabs.List, styles.list);
export const DrawerListTab = themed(Tabs.Tab, styles.tab);
export const DrawerListPanel = themed(Tabs.Panel, styles.panel);
