"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import * as stylex from "@stylexjs/stylex";
import clsx from "clsx";
import type { ReactElement } from "react";
import { Children, cloneElement, isValidElement } from "react";

import { colors, radii } from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  content: {
    flex: "1",
    outline: "none",
  },
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  tabsList: {
    borderRadius: radii.md,
    height: "min-content",
    marginBlock: '0',
    marginInline: 'auto',
    overflow: "hidden",
  },
  tabsTrigger: {
    alignItems: "center",
    backgroundColor: "#aaa",
    color: "#fff",
    display: "inline-flex",
    fontFamily: '"Inter Variable", sans-serif',
    fontWeight: 500,
    gap: "0.2em",
    paddingBlock: '1px',
    paddingInline: '8px',
  },
  tabsTriggerActive: {
    backgroundColor: colors.accentSolid,
  },
  tabsTriggerDisabled: {
    opacity: 0.5,
    pointerEvents: "none",
  },
});

function Tabs({
  style: inlineStyle,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.Root>, "className">) {
  const sx = stylex.props(styles.root);
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      {...props}
      className={sx.className}
      style={{ ...sx.style, ...(inlineStyle as React.CSSProperties) }}
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
