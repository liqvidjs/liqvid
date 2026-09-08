"use client";

import { Menu } from "@base-ui/react/menu";
import * as stylex from "@stylexjs/stylex";

import { extensible, themed } from "#_/design/themed.js";
import { colors, dims, radii } from "#_/design/tokens.stylex.js";

import { useDialogApi } from "./Dialog";

const styles = stylex.create({
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
    userSelect: "none",
  },
  popup: {
    background: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow:
      "0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2)",
    minWidth: "12rem",
    outline: "none",
    padding: "0.25rem",
  },
  positioner: {
    outline: "none",
  },
  separator: {
    background: colors.graySep,
    height: "1px",
    marginBlock: "0.25rem",
    marginInline: "0",
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
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    fontSize: "0.75rem",
    gap: "0.5rem",
    outline: {
      ":focus": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus": "1px",
      default: null,
    },
    paddingBlock: "0.3em",
    paddingInline: "0.5em",
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
