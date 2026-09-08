"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { colors, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedReactNode, LocalizedString } from "#_/utils/i18n.mjs";

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
    borderInlineStartWidth: 0,
    borderRadius: `0 ${radii.md} ${radii.md} 0`,
    paddingInline: spacing.md,
  },

  mainButton: {
    alignItems: "center",
    backgroundColor: {
      ":disabled": "light-dark(#f0f0f0, #333)",
      ":enabled:active": "light-dark(#d0d0d0, #333)",
      ":enabled:hover": "light-dark(#fafafa, #444)",
      default: "light-dark(#f0f0f0, #333)",
    },
    borderColor: "light-dark(#ccc, #555)",
    borderRadius: `${radii.md} 0 0 ${radii.md}`,
    borderStyle: "solid",
    borderWidth: "1px",
    color: {
      ":disabled": "light-dark(#aaa, #eee)",
      default: "light-dark(#000, #fff)",
    },
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.base,
    gap: "0.25rem",
    justifyContent: "center",
    paddingBlock: "0.3em",
    paddingInline: "0.5em",
    transition: "background-color 0.15s",
  },
  mainButtonPrimary: {
    backgroundColor: {
      ":disabled": "light-dark(#93b4f5, #4b6bb0)",
      ":enabled:active": "light-dark(#1e40af, #1d4ed8)",
      ":enabled:hover": "light-dark(#1d4ed8, #2563eb)",
      default: colors.accentSolid,
    },
    borderColor: {
      ":disabled": "light-dark(#93b4f5, #4b6bb0)",
      default: colors.accentSolid,
    },
    color: {
      ":disabled": "light-dark(#e5e7eb, #e5e7eb)",
      default: "#fff",
    },
  },
  shared: {
    alignItems: "center",
    backgroundColor: {
      ":disabled": "light-dark(#f0f0f0, #333)",
      ":enabled:active": "light-dark(#d0d0d0, #333)",
      ":enabled:hover": "light-dark(#fafafa, #444)",
      default: "light-dark(#f0f0f0, #333)",
    },
    borderColor: "light-dark(#ccc, #555)",
    borderStyle: "solid",
    borderWidth: "1px",
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
    paddingBlock: "0.3em",
    paddingInline: "0.5em",
    transition: "background-color 0.15s",
  },
  sharedPrimary: {
    backgroundColor: {
      ":disabled": "light-dark(#93b4f5, #4b6bb0)",
      ":enabled:active": "light-dark(#1e40af, #1d4ed8)",
      ":enabled:hover": "light-dark(#1d4ed8, #2563eb)",
      default: colors.accentSolid,
    },
    borderColor: {
      ":disabled": "light-dark(#93b4f5, #4b6bb0)",
      default: colors.accentSolid,
    },
    color: {
      ":disabled": "light-dark(#e5e7eb, #e5e7eb)",
      default: "#fff",
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
  disabled = false,
  dropdownLabel,
  onClick,
  options,
  variant = "default",
}: ButtonWithDropdownProps) {
  const isPrimary = variant === "primary";

  return (
    <div {...stylex.props(styles.group)}>
      {/** biome-ignore lint/correctness/noRestrictedElements: this is a component */}
      <button
        disabled={disabled}
        onClick={onClick}
        type="button"
        {...stylex.props(
          styles.mainButton,
          isPrimary && styles.mainButtonPrimary,
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
            isPrimary && styles.sharedPrimary,
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
