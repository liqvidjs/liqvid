import * as stylex from "@stylexjs/stylex";

import {
  colors,
  dims,
  opacity,
  rounded,
  scales,
  shadows,
  spacing,
  text,
} from "#_/design/tokens.stylex";
import type { LocalizedReactNode, LocalizedString } from "#_/i18n/shared";
import type { NonCustomizable } from "#_/types/misc";

const styles = stylex.create({
  button: {
    alignItems: "center",
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    gap: spacing.sm,
    opacity: {
      ":disabled": opacity.disabled,
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
    boxShadow: {
      ":focus": shadows.focus,
      default: null,
    },
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
    boxShadow: {
      ":focus": `
        0 0 0 2px oklch(from var(--surface) l c h),
        0 0 0 4px oklch(from ${scales.red700} l c h / 0.8)
      `,
      default: null,
    },
    color: colors.white,
  },

  ghost: {
    backgroundColor: {
      ":active:enabled": colors.btnBgActive,
      ":disabled": colors.btnBg,
      ":hover:enabled": colors.btnBgHover,
      default: null,
    },
    borderStyle: "none",
    boxShadow: {
      ":focus": shadows.focus,
      default: null,
    },
    color: {
      ":disabled": colors.btnColorDisabled,
      default: colors.btnColor,
    },
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
}: NonCustomizable<
  Omit<React.ComponentProps<"button">, "children" | "type">
> & {
  className?: {
    __error: "";
  };
  children?: LocalizedReactNode;
  kind?: "default" | "destructive" | "ghost" | "primary";

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

  type?: "submit";
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
