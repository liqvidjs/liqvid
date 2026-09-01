"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import clsx from "clsx";

import {
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from "./Menu.tsx";

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
          className={styles.dropdownButton}
          disabled={disabled}
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
