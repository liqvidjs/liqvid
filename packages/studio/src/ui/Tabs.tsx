"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import * as stylex from "@stylexjs/stylex";
import clsx from "clsx";
import type { ReactElement } from "react";
import { Children, cloneElement, isValidElement } from "react";

import {
  colors,
  dims,
  opacity,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import type { NonCustomizable } from "#_/types/misc.mjs";

const styles = stylex.create({
  content: {
    flex: "1",
    outline: "none",
  },

  list: {
    backgroundColor: colors.tabTriggerBg,
    borderRadius: radii.md,
    height: "min-content",
    marginBlock: spacing.zero,
    marginInline: spacing.auto,
    overflow: "visible",
    position: "relative",
  },

  root: {
    columnGap: spacing.lg,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.lg,
  },

  trigger: {
    backgroundColor: {
      "[aria-selected='true']": colors.accentSolid,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },

    borderBottomLeftRadius: {
      ":first-child": radii.md,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },

    borderBottomRightRadius: {
      ":last-child": radii.md,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },

    borderTopLeftRadius: {
      ":first-child": radii.md,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },

    borderTopRightRadius: {
      ":last-child": radii.md,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },

    boxShadow: "none",
    color: colors.white,
    fontFamily: typeface.ui,
    // eslint-disable-next-line @stylexjs/valid-styles
    fontSize: "var(--font-size)",

    opacity: {
      "[aria-disabled='true']": opacity.disabled,
      default: null,
    },

    pointerEvents: {
      "[aria-disabled='true']": "none",
      default: null,
    },

    zIndex: {
      ":focus-visible": 1,
      default: null,
    },
  },

  triggerWrap: {
    alignItems: "center",

    borderRadius: radii.md,
    columnGap: spacing.md,

    display: "inline-flex",

    outlineColor: colors.focus,

    outlineStyle: {
      [stylex.when.ancestor(":focus")]: "solid",
      default: null,
    },

    outlineWidth: dims.ring,

    // eslint-disable-next-line @stylexjs/valid-styles
    paddingBlock: "var(--padding-block)",
    // eslint-disable-next-line @stylexjs/valid-styles
    paddingInline: "var(--padding-inline)",
  },
});

const sizeVariants = stylex.create({
  normal: {
    "--font-size": text.base,
    "--padding-block": spacing.sm,
    "--padding-inline": spacing.md,
  },
  small: {
    "--font-size": text.sm,
    "--padding-block": spacing.xs,
    "--padding-inline": spacing.sm,
  },
});

function Tabs({
  className: _,
  size = "normal",
  style,
  ...props
}: NonCustomizable<React.ComponentProps<typeof TabsPrimitive.Root>> & {
  size?: "small" | "normal";
  style?: stylex.StyleXStyles;
}) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      {...props}
      {...stylex.props(styles.root, sizeVariants[size], style)}
    />
  );
}

function TabsList({
  style: inlineStyle,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.List>, "className">) {
  const sx = stylex.props(styles.list);
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      {...props}
      className={sx.className}
      style={{ ...sx.style, ...(inlineStyle as React.CSSProperties) }}
    />
  );
}

function TabsTrigger({
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof TabsPrimitive.Tab>,
  "className" | "style"
>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      {...props}
      {...stylex.props([styles.trigger, stylex.defaultMarker()])}
    >
      <span sx={styles.triggerWrap}>{children}</span>
    </TabsPrimitive.Tab>
  );
}

interface TabsContentProps
  extends Omit<React.ComponentProps<typeof TabsPrimitive.Panel>, "render"> {
  asChild?: boolean;
}

function TabsContent({
  asChild,
  children,
  className,
  ...props
}: TabsContentProps) {
  const sxProps = stylex.props(styles.content);
  const combinedClassName = clsx(sxProps.className, className);

  if (asChild && isValidElement(children)) {
    return (
      <TabsPrimitive.Panel
        {...props}
        render={(renderProps) => {
          const child = Children.only(children) as ReactElement<{
            className?: string;
          }>;
          return cloneElement(child, {
            ...renderProps,
            className: clsx(combinedClassName, child.props.className),
          });
        }}
      />
    );
  }

  return (
    <TabsPrimitive.Panel
      className={combinedClassName}
      data-slot="tabs-content"
      {...props}
    >
      {children}
    </TabsPrimitive.Panel>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
