"use client";

import { Slot } from "@radix-ui/react-slot";
import * as stylex from "@stylexjs/stylex";

import { colors } from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  base: {
    alignItems: "center",
    backgroundColor: colors.accentSolid,
    borderStyle: "none",
    borderRadius: "50%",
    cursor: {
      ":disabled": "not-allowed",
      default: "pointer",
    },
    display: "flex",
    justifyContent: "center",
    opacity: {
      ":disabled": 0.5,
    },
    transition: "background-color 0.15s, opacity 0.15s",
  },
});

// biome-ignore assist/source/useSortedKeys: natural order
const sizes = stylex.create({
  sm: {
    height: "1.75rem",
    width: "1.75rem",
  },
  md: {
    height: "2.25rem",
    width: "2.25rem",
  },
  lg: {
    height: "2.75rem",
    width: "2.75rem",
  },
});

// biome-ignore assist/source/useSortedKeys: natural order
const iconSizes = stylex.create({
  sm: {
    height: "0.875rem",
    width: "0.875rem",
  },
  md: {
    height: "1.125rem",
    width: "1.125rem",
  },
  lg: {
    height: "1.375rem",
    width: "1.375rem",
  },
});

const variants = stylex.create({
  default: {
    backgroundColor: {
      ":active:enabled": colors.grayActive,
      ":hover:enabled": colors.grayHover,
      default: colors.grayUi,
    },
    color: colors.grayNormal,
  },
  primary: {
    backgroundColor: {
      ":active:enabled": colors.accentSolidHover,
      ":hover:enabled": colors.accentSolidHover,
      default: colors.accentSolid,
    },
    color: "var(--accent-contrast)",
  },
});

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon to display */
  children?: React.ReactNode;

  /**
   * Size of the button.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";

  /**
   * Visual variant.
   * @default "default"
   */
  variant?: "default" | "primary";
}

export function IconButton({
  children,
  size = "md",
  variant = "default",
  ...props
}: IconButtonProps) {
  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is where it's defined
    <button
      type="button"
      {...props}
      {...stylex.props(styles.base, sizes[size], variants[variant])}
    >
      <Slot {...stylex.props(iconSizes[size])}>{children}</Slot>
    </button>
  );
}
