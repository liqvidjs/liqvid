"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedReactNode, LocalizedString } from "#_/i18n/shared.mjs";

import {
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from "./Menu.tsx";

const styles = stylex.create({
  group: {
    alignItems: "stretch",
    display: "inline-flex",
  },

  joinButtons: {
    borderInlineStartStyle: "none",
    /* collapse the shared border between the two buttons */
    borderInlineStartWidth: spacing.zero,
    borderRadius: `0 ${radii.md} ${radii.md} 0`,
  },

  mainButton: {
    backgroundColor: {
      ":disabled": colors.btnBg,
      ":enabled:active": colors.btnBgActive,
      ":enabled:hover": colors.btnBgHover,
      default: colors.btnBg,
    },
    borderColor: colors.btnBorder,
    borderRadius: `${radii.md} 0 0 ${radii.md}`,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: {
      ":disabled": colors.btnColorDisabled,
      default: colors.btnColor,
    },
    fontSize: text.base,
    justifyContent: "center",
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
    rowGap: spacing.md,
    transition: "background-color 0.15s",
  },
  shared: {
    alignItems: "center",
    backgroundColor: {
      ":disabled": colors.btnBg,
      ":enabled:active": colors.btnBgActive,
      ":enabled:hover": colors.btnBgHover,
      default: colors.btnBg,
    },
    borderColor: colors.sep,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: {
      ":disabled": colors.btnColorDisabled,
      default: colors.btnColor,
    },
    columnGap: spacing.md,
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "flex",
    justifyContent: "center",
    rowGap: spacing.md,
    transition: "background-color 0.15s",
  },
  sharedPrimary: {
    backgroundColor: {
      // ":disabled": colors.accentDisabled,
      ":enabled:active": colors.accentActive,
      ":enabled:hover": colors.accentHover,
      default: colors.accentSolid,
    },
    borderColor: colors.accentActive,
    color: {
      // ":disabled": colors.accentActive,
      default: colors.white,
    },
    opacity: {
      ":disabled": 0.4,
      default: null,
    },
  },
});

export interface DropdownOption {
  /** Whether the option is disabled */
  disabled?: boolean;

  /** Stable identifier for the option */
  id: string;

  /** Display label */
  label: LocalizedReactNode;

  /** Invoked when the option is selected */
  onSelect: () => void;
}

export interface ButtonWithDropdownProps {
  /** Contents of the main action button */
  children: LocalizedReactNode;

  /** Whether both the main button and dropdown toggle are disabled */
  disabled?: boolean;

  /** Accessible label for the dropdown toggle */
  dropdownLabel: LocalizedString;

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
  // disabled = false,
  dropdownLabel,
  onClick,
  options,
  variant = "default",
}: ButtonWithDropdownProps) {
  const isPrimary = variant === "primary";
  const disabled = true;

  return (
    <div sx={styles.group}>
      {/** biome-ignore lint/correctness/noRestrictedElements: this is a component */}
      <button
        disabled={disabled}
        onClick={onClick}
        type="button"
        {...stylex.props(
          styles.mainButton,
          styles.shared,
          (true || isPrimary) && styles.sharedPrimary,
        )}
      >
        {children}
      </button>
      <MenuRoot>
        <MenuTrigger
          aria-label={dropdownLabel}
          disabled={disabled}
          style={[
            styles.joinButtons,
            styles.shared,
            (true || isPrimary) && styles.sharedPrimary,
          ]}
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
