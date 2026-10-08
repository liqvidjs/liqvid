"use client";

import { Menu, type MenuTriggerProps } from "@base-ui/react/menu";
import { useColorScheme } from "@liqvid/color-scheme/react";
import * as stylex from "@stylexjs/stylex";

import { useIsStudio } from "#_/contexts/is-studio";
import { extensible, themed } from "#_/design/themed";
import {
  colors,
  dims,
  rounded,
  shadows,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex";

import { Button } from "./Button.tsx";
import { useDialogApi } from "./dialogs-shared.ts";

const styles = stylex.create({
  item: {
    alignItems: "center",
    backgroundColor: {
      ":active": colors.affordanceActive,
      ":focus": colors.affordanceHover,
      default: colors.affordanceBg,
    },
    borderRadius: rounded.sm,
    boxShadow: {
      ":focus-visible": null,
      default: null,
    },
    color: colors.grayNormal,
    columnGap: spacing.lg,
    cursor: "pointer",
    display: "flex",
    fontSize: text.md,
    outlineStyle: "none",
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    rowGap: spacing.lg,
    userSelect: "none",
  },

  popup: {
    backgroundColor: colors.affordanceBg,
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    boxShadow: shadows.xl,
    fontFamily: typeface.ui,
    minWidth: "12rem",
  },

  positioner: {
    outline: "none",
  },

  separator: {
    backgroundColor: colors.affordanceSep,
    height: dims.sep,
  },
});

export const MenuItem = themed(Menu.Item, styles.item);
export const MenuLinkItem = themed(Menu.LinkItem, styles.item);

export function MenuPopup({
  style,
  ...props
}: Omit<React.ComponentProps<typeof Menu.Popup>, "className" | "style"> & {
  className?: {
    __error: "this component does not support customization";
  };
  style?: stylex.StyleXStyles;
}) {
  const { colorScheme } = useColorScheme();
  const isStudio = useIsStudio();

  const sx = stylex.props(styles.popup, style);

  return (
    <Menu.Popup
      data-color-scheme={colorScheme}
      {...props}
      className={sx.className}
      style={{
        ...sx.style,
        colorScheme: isStudio ? undefined : colorScheme,
      }}
    />
  );
}

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

export function MenuTrigger<Payload>({
  style,
  ...props
}: MenuTriggerProps<Payload> & React.ComponentProps<typeof Button>) {
  return <Menu.Trigger render={<Button style={style} />} {...props} />;
}
