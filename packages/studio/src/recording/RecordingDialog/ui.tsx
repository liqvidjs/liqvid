import * as stylex from "@stylexjs/stylex";

import { H } from "#_/components/headings";
import { themed } from "#_/design/themed";
import { spacing } from "#_/design/tokens.stylex";

const styles = stylex.create({
  subtitle: {
    marginBottom: spacing.md,
  },
});

export const Subtitle = themed(H, styles.subtitle);
