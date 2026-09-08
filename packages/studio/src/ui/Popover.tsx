"use client";

import { Popover } from "@base-ui/react/popover";
import * as stylex from "@stylexjs/stylex";

import { themed } from "#_/design/themed.js";
import { colors, dims, radii } from "#_/design/tokens.stylex.js";

import { useDialogApi } from "./Dialog.tsx";

const styles = stylex.create({
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
