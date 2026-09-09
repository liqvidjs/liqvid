"use client";

// biome-ignore lint/style/noRestrictedImports: this is where it's defined
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import * as stylex from "@stylexjs/stylex";
import Link from "next/link";

import { fonts } from "#_/design/styles.js";
import { extensible, themed } from "#_/design/themed.js";
import { colors, radii, spacing } from "#_/design/tokens.stylex.js";

import { useDialogApi } from "./Dialog";

const styles = stylex.create({
  content: {
    backgroundColor: colors.graySubtle,
    borderRadius: radii.md,
    color: colors.grayNormal,
    overflow: "hidden",
  },
  icon: {},
  item: {},
  link: {
    backgroundColor: {
      ":hover": colors.grayHover,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },
    display: "block",
    padding: `${spacing.lg} ${spacing.xl}`,
  },
  list: {},
  popup: {},
  positioner: {},
  trigger: {},
});

export function NavigationMenuLink({
  style,
  ...props
}: Omit<
  React.ComponentProps<typeof NavigationMenu.Link>,
  "className" | "href" | "style"
> &
  Pick<React.ComponentProps<typeof Link>, "href"> & {
    style?: stylex.StyleXStyles;
  }) {
  return (
    <Link
      {...props}
      {...stylex.props(style ? [styles.link, style] : styles.link)}
    />
  );
}

export function NavigationMenuPositioner(
  props: Omit<
    React.ComponentProps<typeof NavigationMenu.Positioner>,
    "className"
  >,
) {
  const { level } = useDialogApi();
  const sx = stylex.props(styles.positioner);
  return (
    <NavigationMenu.Positioner
      {...props}
      className={sx.className}
      style={{ ...sx.style, zIndex: `calc(1000 * ${level} + 1)` }}
    />
  );
}

export const NavigationMenuArrow = NavigationMenu.Arrow;
export const NavigationMenuContent = extensible()(NavigationMenu.Content, [
  styles.content,
  fonts.ui,
]);
export const NavigationMenuIcon = themed(NavigationMenu.Icon, styles.icon);
export const NavigationMenuItem = themed(NavigationMenu.Item, styles.item);
export const NavigationMenuList = themed(NavigationMenu.List, [styles.list]);
export const NavigationMenuPopup = themed(NavigationMenu.Popup, styles.popup);
export const NavigationMenuPortal = NavigationMenu.Portal;
export const NavigationMenuRoot = NavigationMenu.Root;
export const NavigationMenuViewport = NavigationMenu.Viewport;
export const NavigationMenuTrigger = extensible()(
  NavigationMenu.Trigger,
  styles.trigger,
);
