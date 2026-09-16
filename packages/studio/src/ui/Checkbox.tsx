import * as stylex from "@stylexjs/stylex";

import { colors } from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  checkbox: {
    accentColor: colors.accentSolid,
  },
});

export function Checkbox(props: Omit<React.ComponentProps<"input">, "type">) {
  // biome-ignore lint/correctness/noRestrictedElements: this is the styled version
  return <input sx={styles.checkbox} type="checkbox" {...props} />;
}
