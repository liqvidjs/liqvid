import * as stylex from "@stylexjs/stylex";

import { colors } from "#_/design/tokens.stylex.js";

const settingsSpin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  spinner: {
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationName: settingsSpin,
    animationTimingFunction: "linear",
    color: colors.grayDim,
    flexShrink: 0,
  },
});
