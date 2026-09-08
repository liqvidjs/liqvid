"use client";

import * as stylex from "@stylexjs/stylex";

import { colors, radii, spacing } from "#_/design/tokens.stylex.js";

export const styles = stylex.create({
  label: { alignItems: "center", display: "flex", gap: spacing.md },
  providerCard: {
    background: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
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
});

/** @package */
export function ProviderCard({
  children,
  enabled,
  onToggle,
  title,
}: {
  children: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  title: string;
}) {
  return (
    <div {...stylex.props(styles.providerCard)}>
      <label {...stylex.props(styles.label)}>
        <input
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          type="checkbox"
        />
        <span {...stylex.props(styles.providerTitle)}>{title}</span>
      </label>
      {enabled && (
        <div {...stylex.props(styles.providerFields)}>{children}</div>
      )}
    </div>
  );
}
