"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { colors, radii } from "#_/design/tokens.stylex.js";
import type { LocalizedString } from "#_/utils/i18n.mjs";

const styles = stylex.create({
  radioTabs: {
    backgroundColor: colors.grayUi,
    borderRadius: radii.lg,
    display: "inline-flex",
    gap: "2px",
    padding: "3px",
    width: "max-content",
  },
  radioTabsItem: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: radii.md,
    borderStyle: "none",
    color: colors.grayDim,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    paddingBlock: "6px",
    paddingInline: "10px",
    transition: "background-color 0.15s, color 0.15s",
  },
  radioTabsItemChecked: {
    backgroundColor: colors.accentSolid,
    color: colors.white,
  },
});

interface RadioTabsProps<T extends string> {
  children?: ReactNode;
  onValueChange: (value: T) => void;
  value: T;
}

function RadioTabs<T extends string>({
  value,
  onValueChange,
  ...props
}: RadioTabsProps<T>) {
  return (
    <RadioGroup
      onValueChange={onValueChange as (value: string) => void}
      value={value}
      {...props}
      {...stylex.props(styles.radioTabs)}
    />
  );
}

interface RadioTabsItemProps extends React.ComponentProps<typeof Radio.Root> {
  /** Phosphor icon component to display in the tab */
  icon: PhosphorIcon;

  /** Icon size (default: 18) */
  iconSize?: number;

  title: LocalizedString;
}

function RadioTabsItem({
  icon: IconComponent,
  iconSize = 18,
  title,
  value,
  ...props
}: RadioTabsItemProps) {
  return (
    <Radio.Root
      title={title}
      value={value}
      {...props}
      className={(state) =>
        stylex.props(
          styles.radioTabsItem,
          state.checked && styles.radioTabsItemChecked,
        ).className
      }
      render={(renderProps, state) => (
        <span {...renderProps}>
          <IconComponent
            size={iconSize}
            style={{ display: state.checked ? "none" : "block" }}
          />
          <IconComponent
            size={iconSize}
            style={{ display: state.checked ? "block" : "none" }}
            weight="fill"
          />
        </span>
      )}
    />
  );
}

export { RadioTabs, RadioTabsItem };
