"use client";

import { Popover } from "@base-ui/react/popover";
import * as stylex from "@stylexjs/stylex";

import { themed } from "#_/design/themed.js";
import {
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";

import { useDialogApi } from "./Dialog.tsx";

const styles = stylex.create({
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

export const PopoverRoot = Popover.Root;

export const PopoverTrigger = themed(Popover.Trigger, styles.trigger);

export const PopoverPortal = Popover.Portal;

export function PopoverPositioner(
  props: Omit<React.ComponentProps<typeof Popover.Positioner>, "className">,
) {
  const { level } = useDialogApi();
  const sx = stylex.props(styles.positioner);
  return (
    <Popover.Positioner
      {...props}
      className={sx.className}
      style={{ ...sx.style, zIndex: `calc(1000 * ${level} + 1)` }}
    />
  );
}

export const PopoverPopup = themed(Popover.Popup, styles.popup);
