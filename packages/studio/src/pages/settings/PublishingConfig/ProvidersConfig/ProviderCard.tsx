"use client";

import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing } from "#_/design/tokens.stylex.js";
import type { LocalizedReactNode } from "#_/i18n/shared.mjs";

const styles = stylex.create({
  label: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
    outlineColor: colors.graySep,
  },
  providerCard: {
    backgroundColor: colors.graySubtle,
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
    borderTopWidth: dims.sep,
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },

  providerTitle: {
    fontWeight: "bold",
  },
});

/** @package */
export function ProviderCard({
  children,
  enabled,
  icon,
  onToggle,
  title,
}: {
  children: LocalizedReactNode;
  enabled: boolean;
  icon?: React.ReactNode;
  onToggle: (enabled: boolean) => void;
  title: LocalizedReactNode;
}) {
  return (
    <div sx={styles.providerCard}>
      <label sx={styles.label}>
        <input
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          type="checkbox"
        />
        {icon}
        <span sx={styles.providerTitle}>{title}</span>
      </label>
      {enabled && <div sx={styles.providerFields}>{children}</div>}
    </div>
  );
}
