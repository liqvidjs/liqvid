// biome-ignore lint/style/noRestrictedImports: this is the styled version
import { Radio } from "@base-ui/react/radio";
import * as stylex from "@stylexjs/stylex";

import { themed } from "#_/design/themed.js";
import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";

const styles = stylex.create({

  radioIndicator: {
    backgroundColor: colors.accentSolid,
    borderRadius: radii.circle,
    borderStyle: "none",
    height: "0.5rem",
    width: "0.5rem",
  },

  radioRoot: {
    alignItems: "center",
    appearance: "none",
    borderColor: colors.graySep,
    borderRadius: radii.circle,
    borderStyle: "solid",
    borderWidth: spacing.sm,
    cursor: "pointer",
    display: "flex",
    flexShrink: 0,
    height: "1rem",
    justifyContent: "center",
    marginTop: spacing.sm,
    padding: spacing.zero,
    width: "1rem",
  },
});

export const RadioRoot = themed(Radio.Root, styles.radioRoot);
export const RadioIndicator = themed(Radio.Indicator, styles.radioIndicator);
