"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import clsx from "clsx";

import { padding, radii } from "#_/design/tokens.stylex.js";

import {
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from "./Menu.tsx";

const newStyles = stylex.create({
  joinButtons: {
    /* collapse the shared border between the two buttons */
    borderInlineStart: "none",
    borderRadius: `0 ${radii.md} ${radii.md} 0`,
    paddingInline: padding.md,
  },
  shared: {
    alignItems: "center",
    backgroundColor: {
      ":disabled": "light-dark(#f0f0f0, #333)",
      ":enabled:active": "light-dark(#d0d0d0, #333)",
      ":enabled:hover": "light-dark(#fafafa, #444)",
      default: "light-dark(#f0f0f0, #333)",
    },
    border: "1px solid light-dark(#ccc, #555)",
    color: {
      ":disabled": "light-dark(#aaa, #eee)",
      default: "light-dark(#000, #fff)",
    },
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    gap: "0.25rem",
    justifyContent: "center",
    padding: "0.3em 0.5em",
    transition: "background-color 0.15s",
  },
});

import styles from "./ButtonWithDropdown.module.css";

export interface DropdownOption {
  /** Whether the option is disabled */
  disabled?: boolean;

  /** Stable identifier for the option */
  id: string;

  /** Display label */
  label: React.ReactNode;

  /** Invoked when the option is selected */
  onSelect: () => void;
}

export interface ButtonWithDropdownProps {
  /** Contents of the main action button */
  children: React.ReactNode;

  /** Whether both the main button and dropdown toggle are disabled */
  disabled?: boolean;

  /** Accessible label for the dropdown toggle */
  dropdownLabel: string;

  /** Invoked when the main action button is clicked */
  onClick: () => void;

  /** Options shown in the attached dropdown menu */
  options: DropdownOption[];

  /** Visual variant of the main button. Defaults to "default". */
  variant?: "default" | "primary";
}

/**
 * A split button: a primary action button with an attached dropdown menu of
 * secondary actions.
 */
export function ButtonWithDropdown({
  children,
  disabled = false,
  dropdownLabel,
  onClick,
  options,
  variant = "default",
}: ButtonWithDropdownProps) {
  return (
    <div
      className={clsx(styles.group, variant !== "default" && styles[variant])}
    >
      {/** biome-ignore lint/correctness/noRestrictedElements: this is a component */}
      <button
        className={styles.mainButton}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
      <MenuRoot>
        <MenuTrigger
          aria-label={dropdownLabel}
          disabled={disabled}
          style={[newStyles.joinButtons, newStyles.shared]}
        >
          <CaretDownIcon />
        </MenuTrigger>
        <MenuPortal>
          <MenuPositioner align="end" sideOffset={4}>
            <MenuPopup>
              {options.map((option) => (
                <MenuItem
                  disabled={option.disabled}
                  key={option.id}
                  onClick={option.onSelect}
                >
                  {option.label}
                </MenuItem>
              ))}
            </MenuPopup>
          </MenuPositioner>
        </MenuPortal>
      </MenuRoot>
    </div>
  );
}
