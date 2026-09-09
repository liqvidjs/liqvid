"use client";
import * as stylex from "@stylexjs/stylex";

import {
  breakpoints,
  colors,
  dims,
  radii,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";

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
    background: colors.graySubtle,
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
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string | undefined;
}) {
  return (
    <label sx={styles.field}>
      <span sx={styles.fieldLabel}>{label}</span>
      <input
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={styles.input}
        type="text"
        value={value}
      />
    </label>
  );
}
