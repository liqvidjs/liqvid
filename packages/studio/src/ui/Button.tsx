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
    gap: spacing.sm,
    opacity: {
      ":disabled": 0.3,
      default: null,
    },
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

const sizeVariants = stylex.create({
  normal: {
    fontSize: text.base,
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
  },
  small: {
    fontSize: text.sm,
    paddingBlock: spacing.xs,
    paddingInline: spacing.sm,
  },
});

export function Button({
  kind = "default",
  size = "normal",
  style,
  ...props
}: NonCustomizable<Omit<React.ComponentProps<"button">, "children">> & {
  className?: {
    __error: "";
  };
  children?: LocalizedReactNode;
  kind?: "default" | "destructive" | "primary";

  size?: "normal" | "small";

  style?: stylex.StaticStyles<
    {
      display?: "flex" | "inline-flex";
    } & Pick<
      stylex.CSSProperties,
      "float" | "marginBottom" | "marginLeft" | "marginRight" | "marginTop"
    >
  >;

  title?: LocalizedString;
}) {
  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is where it's defined
    <button
      type="button"
      {...props}
      sx={[styles.button, styles[kind], sizeVariants[size], style]}
    />
  );
}
