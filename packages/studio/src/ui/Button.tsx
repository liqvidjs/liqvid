import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedString } from "#_/i18n/shared.mjs";

const styles = stylex.create({
  button: {
    alignItems: "center",
    backgroundColor: {
      ":active:enabled": colors.btnBgActive,
      ":disabled": colors.btnBg,
      ":hover:enabled": colors.btnBgHover,
      default: colors.btnBg,
    },
    borderColor: colors.btnBorder,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,

    color: {
      ":disabled": colors.btnColorDisabled,
      default: colors.btnColor,
    },
    columnGap: ".25rem",
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.rem075,
    paddingBlock: spacing.em03,
    paddingInline: spacing.em05,
    rowGap: ".25rem",
    transition: "background-color 0.15s",
  },
});

export function Button({
  className,
  ...props
}: React.ComponentProps<"button"> & {
  title?: LocalizedString;
}) {
  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is where it's defined
    <button type="button" {...props} sx={styles.button} />
  );
}
