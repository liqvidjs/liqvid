import {
  type IconProps,
  SpinnerGapIcon,
  // biome-ignore lint/style/noRestrictedImports: this is where Spinner is defined
  SpinnerIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { colors } from "#_/design/tokens.stylex.js";

const settingsSpin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  spinner: {
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationName: settingsSpin,
    animationTimingFunction: "linear",
    color: colors.grayDim,
    flexShrink: 0,
  },
});

export function Spinner({
  variant = "gap",
  ...props
}: { variant?: "solid" | "gap" } & IconProps) {
  const Component = {
    gap: SpinnerGapIcon,
    solid: SpinnerIcon,
  }[variant];

  return <Component aria-hidden {...stylex.props(styles.spinner)} {...props} />;
}
