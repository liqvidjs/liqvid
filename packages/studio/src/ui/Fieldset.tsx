import * as stylex from "@stylexjs/stylex";

import { themed } from "#_/design/themed.js";
import { radii, spacing, text } from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  fieldset: {
    backgroundColor: "light-dark(white, red)",
    borderRadius: radii.lg,
    display: "flex",
    flexDirection: "column",
    marginBottom: spacing.huge,
    padding: spacing.lg,
  },
  legend: {
    alignItems: "center",
    all: "unset",
    clear: "both",
    display: "flex",
    float: "left",
    fontSize: text.base,
    fontWeight: "bold",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
});

export const FieldSet = themed("fieldset", styles.fieldset);
export const Legend = themed("legend", styles.legend);
