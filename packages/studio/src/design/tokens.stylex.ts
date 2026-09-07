import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
  accentSolid: "#af1866",
  accentSolidHover: "light-dark(#9e0058, #922257)",
  grayActive: "light-dark(#e0e1e6, #303136)",
  grayHover: "light-dark(#e7e8ec, #292a2e)",
  grayNormal: "light-dark(#1e1f24, #eeeef0)",
  grayUi: "light-dark(#eff0f3, #222325)",
});

export const text = stylex.defineVars({
  "2xl": "4rem",
  "3xl": "5rem",
  base: "1.125rem",
  lg: "2rem",
  sm: "0.75rem",
  xl: "3rem",
  xs: "0.5rem",
});
