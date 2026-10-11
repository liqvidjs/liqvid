"use client";

import { CircleNotchIcon, type IconProps } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { colors } from "#_/design/tokens.stylex";

const settingsSpin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  spinner: {
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationName: settingsSpin,
    animationTimingFunction: "linear",
    color: colors.grayDim,
    flexShrink: 0,
  },
});

export function Spinner({
  style,
  ...props
}: { style?: stylex.StyleXStyles } & Omit<IconProps, "style">) {
  return (
    <CircleNotchIcon
      aria-hidden
      {...stylex.props(styles.spinner, style)}
      {...props}
    />
  );
}
