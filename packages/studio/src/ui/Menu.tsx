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
    backgroundColor: {
      ":active": colors.affordanceActive,
      ":focus": colors.affordanceHover,
      default: null,
    },
    borderRadius: radii.sm,
    color: colors.grayNormal,
    columnGap: spacing.lg,
    cursor: "pointer",
    display: "flex",
    fontSize: text.md,
    outline: {
      ":focus": "none",
      default: null,
    },
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    rowGap: spacing.lg,
    userSelect: "none",
  },
  popup: {
    backgroundColor: colors.affordanceBg,
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    boxShadow: shadows.xl,
    minWidth: "12rem",
  },
  positioner: {
    outline: "none",
  },
  separator: {
    backgroundColor: colors.graySep,
    height: dims.sep,
    marginBlock: spacing.md,
    marginInline: spacing.zero,
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
    columnGap: spacing.lg,
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
    rowGap: spacing.lg,
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

/** @future */
export const MenuSeparator = themed(Menu.Separator, styles.separator);

export const MenuTrigger = extensible()(Menu.Trigger, styles.trigger);
