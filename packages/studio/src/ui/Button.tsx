import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedReactNode, LocalizedString } from "#_/i18n/shared.mjs";
import type { NonCustomizable } from "#_/types/misc.mjs";

const styles = stylex.create({
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.base,
    gap: spacing.sm,
    opacity: {
      ":disabled": 0.3,
      default: null,
    },
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
    rowGap: spacing.md,
    transition: "background-color 0.10s",
  },

  default: {
    backgroundColor: {
      ":active:enabled": colors.btnBgActive,
      ":disabled": colors.btnBg,
      ":hover:enabled": colors.btnBgHover,
      default: colors.btnBg,
    },
    borderColor: colors.btnBorder,
    color: {
      ":disabled": colors.btnColorDisabled,
      default: colors.btnColor,
    },
  },

  destructive: {
    backgroundColor: {
      ":active:enabled": colors.destroyActive,
      ":hover:enabled": colors.destroyHover,
      default: colors.destroy,
    },
    borderColor: colors.destroyBorder,
    color: colors.white,
  },

  primary: {
    backgroundColor: {
      ":active:enabled": colors.accentActive,
      ":hover:enabled": colors.accentHover,
      default: colors.accentSolid,
    },
    borderColor: colors.accentActive,
    color: colors.white,
  },
});

export function Button({
  kind = "default",
  style,
  ...props
}: NonCustomizable<Omit<React.ComponentProps<"button">, "children">> & {
  className?: {
    __error: "";
  };
  children?: LocalizedReactNode;
  kind?: "default" | "destructive" | "primary";

  style?: stylex.StaticStyles<{
    marginTop?: string | number;
    marginLeft?: string | number;
    marginRight?: string | number;
    marginBottom?: string | number;
  }>;
  title?: LocalizedString;
}) {
  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is where it's defined
    <button
      type="button"
      {...props}
      sx={[styles.button, styles[kind], style]}
    />
  );
}
