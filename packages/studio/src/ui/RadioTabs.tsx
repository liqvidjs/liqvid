"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { Icon } from "@phosphor-icons/react";
import classNames from "classnames";
import type { ReactNode } from "react";

import styles from "./RadioTabs.module.css";

interface RadioTabsProps<T extends string> {
  children?: ReactNode;
  className?: string;
  onValueChange: (value: T) => void;
  value: T;
}

function RadioTabs<T extends string>({
  className,
  value,
  onValueChange,
  ...props
}: RadioTabsProps<T>) {
  return (
    <RadioGroup
      className={classNames(styles.RadioTabs, className)}
      onValueChange={onValueChange as (value: string) => void}
      value={value}
      {...props}
    />
  );
}

interface RadioTabsItemProps extends React.ComponentProps<typeof Radio.Root> {
  /** Phosphor icon component to display in the tab */
  icon: Icon;

  /** Icon size (default: 18) */
  iconSize?: number;
}

function RadioTabsItem({
  className,
  icon: IconComponent,
  iconSize = 18,
  title,
  value,
  ...props
}: RadioTabsItemProps) {
  return (
    <Radio.Root
      className={classNames(styles.RadioTabsItem, className)}
      title={title}
      value={value}
      {...props}
    >
      <IconComponent className={styles.iconRegular} size={iconSize} />
      <IconComponent
        className={styles.iconFill}
        size={iconSize}
        weight="fill"
      />
    </Radio.Root>
  );
}

export { RadioTabs, RadioTabsItem };
