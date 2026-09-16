"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import * as stylex from "@stylexjs/stylex";
import clsx from "clsx";
import type { ReactElement } from "react";
import { Children, cloneElement, isValidElement } from "react";

import {
  colors,
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
  root: {
    columnGap: spacing.lg,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.lg,
  },
  tabsList: {
    borderRadius: radii.md,
    height: "min-content",
    marginBlock: spacing.zero,
    marginInline: spacing.auto,
    overflow: "hidden",
  },
  tabsTrigger: {
    alignItems: "center",
    backgroundColor: colors.tabTriggerBg,
    color: colors.white,
    columnGap: spacing.md,
    display: "inline-flex",
    fontFamily: typeface.ui,
    // eslint-disable-next-line @stylexjs/valid-styles
    fontSize: "var(--font-size)",
    // eslint-disable-next-line @stylexjs/valid-styles
    paddingBlock: "var(--padding-block)",
    // eslint-disable-next-line @stylexjs/valid-styles
    paddingInline: "var(--padding-inline)",
    rowGap: spacing.md,
  },
  tabsTriggerActive: {
    backgroundColor: colors.accentSolid,
  },
  tabsTriggerDisabled: {
    opacity: 0.5,
    pointerEvents: "none",
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
  const sx = stylex.props(styles.tabsList);
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
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      {...props}
      className={(state) => {
        const sx = stylex.props(
          styles.tabsTrigger,
          state.active && styles.tabsTriggerActive,
          state.disabled && styles.tabsTriggerDisabled,
        );
        return clsx(sx.className, className);
      }}
    />
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
