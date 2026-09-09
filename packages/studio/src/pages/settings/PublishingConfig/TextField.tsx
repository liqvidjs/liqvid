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

export const styles = stylex.create({
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

  itemSelected: {
    background: "var(--accent-ui)",
  },

  legend: {
    fontSize: text.base,
    fontWeight: "bold",
    padding: `0 ${spacing.md}`,
  },
  main: {
    fontSize: text.base,
    marginBlock: spacing.zero,
    marginInline: spacing.auto,
    padding: spacing.lg,
    width: {
      default: null,
      [breakpoints.desktop]: "48rem",
    },
  },

  name: {
    flex: "1",
  },

  optionLabel: {
    alignItems: "center",
    display: "flex",
    gap: spacing.lg,
  },

  popup: {
    background: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: radii.xl,
    borderStyle: "solid",
    borderWidth: dims.sep,
    boxShadow: shadows.dialog,
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    minWidth: "var(--anchor-width, 20rem)",
    padding: spacing.xs,
  },

  positioner: {
    zIndex: 30,
  },

  providerCard: {
    background: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },

  providerFields: {
    borderTopColor: colors.graySep,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  providerTitle: {
    fontWeight: "bold",
  },

  saveButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: {
      ":hover:not(:disabled)": colors.accentSolidHover,
      default: colors.accentSolid,
    },
    borderRadius: radii.lg,
    borderStyle: "none",
    color: colors.white,
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.base,
    gap: spacing.md,
    opacity: {
      ":disabled": 0.6,
      default: null,
    },
    padding: `${spacing.md} ${spacing.xl}`,
  },

  trigger: {
    alignItems: "center",
    background: {
      ":hover:not([data-disabled])": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: {
      ":hover:not([data-disabled])": colors.graySep,
      default: colors.graySep,
    },
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.base,
    gap: spacing.lg,
    justifyContent: "space-between",
    maxWidth: "20rem",
    opacity: {
      default: null,
    },
    outline: {
      ":focus-visible": `2px solid ${colors.accentSolid}`,
      default: null,
    },
    outlineOffset: {
      ":focus-visible": "1px",
      default: null,
    },
    padding: `${spacing.md} ${spacing.lg}`,
    textAlign: "left",
    transition: "background-color 0.15s, border-color 0.15s",
    width: "100%",
  },

  triggerDisabled: {
    cursor: "default",
    opacity: 0.6,
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
