"use client";

import { Menu } from "@base-ui/react/menu";
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

import { useDialogApi } from "./Dialog";

const styles = stylex.create({
  item: {
    alignItems: "center",
    background: {
      ":focus": colors.grayHover,
      default: null,
    },
    borderRadius: radii.sm,
    color: colors.grayNormal,
    columnGap: "0.5rem",
    cursor: "pointer",
    display: "flex",
    fontSize: text.md,
    outline: {
      ":focus": "none",
      default: null,
    },
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    rowGap: "0.5rem",
    userSelect: "none",
  },
  popup: {
    background: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    boxShadow: shadows.xl,
    minWidth: "12rem",
    outline: "none",
    padding: spacing.md,
  },
  positioner: {
    outline: "none",
  },
  separator: {
    background: colors.graySep,
    height: "1px",
    marginBlock: spacing.md,
    marginInline: spacing.zero,
  },
  trigger: {
    alignItems: "center",
    background: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.inherit,
    columnGap: "0.5rem",
    cursor: "pointer",
    display: "flex",
    fontSize: text.md,
    outline: {
      ":focus": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus": "1px",
      default: null,
    },
    paddingBlock: spacing.sm,
    paddingInline: spacing.sm,
    rowGap: "0.5rem",
  },
});

export const MenuItem = themed(Menu.Item, styles.item);

export const MenuPopup = themed(Menu.Popup, styles.popup);

export const MenuPortal = Menu.Portal;

export function MenuPositioner(
  props: Omit<React.ComponentProps<typeof Menu.Positioner>, "className">,
) {
  const { level } = useDialogApi();
  const sx = stylex.props(styles.positioner);
  return (
    <Menu.Positioner
      {...props}
      className={sx.className}
      style={{ ...sx.style, zIndex: `calc(1000 * ${level} + 1)` }}
    />
  );
}

export const MenuRoot = Menu.Root;

export const MenuSeparator = themed(Menu.Separator, styles.separator);

export const MenuTrigger = extensible()(Menu.Trigger, styles.trigger);
