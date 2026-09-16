"use client";

import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedString, PlainString } from "#_/i18n/shared.mjs";

const styles = stylex.create({
  field: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },

  fieldLabel: {
    color: colors.grayDim,
    fontSize: text.sm,
  },

  input: {
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    fontSize: text.base,
    maxWidth: "24rem",
    outline: {
      ":focus-visible": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus-visible": "1px",
      default: null,
    },
    padding: `${spacing.md} ${spacing.lg}`,
    width: "100%",
  },
});

export function TextField({
  label,
  labelProps,
  onChange,
  placeholder,
  style,
  value,
  ...props
}: {
  label?: LocalizedString;
  labelProps?: React.ComponentProps<"span">;
  onChange: (value: string) => void;
  placeholder?: LocalizedString | PlainString;
  style?: stylex.StyleXStyles<{
    fontFamily?: string;
  }>;
  value: string | undefined;
} & Omit<
  React.ComponentProps<"input">,
  "className" | "children" | "style" | "onChange"
>) {
  if (label) {
    return (
      <label sx={styles.field}>
        <span sx={styles.fieldLabel} {...labelProps}>
          {label}
        </span>
        {/** biome-ignore lint/correctness/noRestrictedElements: this is the styled version */}
        <input
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          sx={[styles.input, style]}
          type="text"
          value={value}
          {...props}
        />
      </label>
    );
  }

  return (
    /** biome-ignore lint/correctness/noRestrictedElements: this is the styled version */
    <input
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={[styles.input, style]}
      type="text"
      value={value}
      {...props}
    />
  );
}
