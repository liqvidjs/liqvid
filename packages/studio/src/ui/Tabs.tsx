"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import clsx from "clsx";
import type { ReactElement } from "react";
import { Children, cloneElement, isValidElement } from "react";

import styles from "./Tabs.module.css";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={clsx("flex flex-col gap-2", className)}
      data-slot="tabs"
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={clsx(
        styles.TabsList,
        "inline-flex w-fit items-center justify-center rounded-lg bg-muted p-[3px]",
        className,
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={clsx(
        styles.TabsTrigger,
        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap border border-transparent font-medium text-sm transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
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
  const combinedClassName = clsx("flex-1 outline-none", className);

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
