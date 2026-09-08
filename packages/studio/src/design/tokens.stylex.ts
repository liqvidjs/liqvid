import * as stylex from "@stylexjs/stylex";

export const breakpoints = stylex.defineConsts({
  desktop: "@media (min-width: 1280px)",
  mobile: "@media (max-width: 640px)",
  tablet: "@media (min-width: 641px) and (max-width: 1279px)",
});

export const colors = stylex.defineVars({
  accentSolid: "#af1866",
  accentSolidHover: "light-dark(#9e0058, #922257)",
  errorSolid: "light-dark(#dc2626, #ef4444)",
  errorSolidHover: "light-dark(#b91c1c, #dc2626)",
  errorSubtle: "light-dark(#fef2f2, #450a0a)",
  errorText: "light-dark(#dc2626, #fca5a5)",
  grayActive: "light-dark(#e0e1e6, #303136)",
  grayApp: "light-dark(#fff, #1f1f1f)",
  grayDim: "light-dark(#aaa0ab, #999)",
  grayHover: "light-dark(#e7e8ec, #292a2e)",
  grayNormal: "light-dark(#333, #eeeef0)",
  graySep: "light-dark(#e5e5e5, #333)",
  graySubtle: "light-dark(#f5f5f5, #252525)",
  grayUi: "light-dark(#eff0f3, #222325)",
  successSolid: "light-dark(#16a34a, #22c55e)",
  white: "#fff",
});

export const dims = stylex.defineConsts({
  sep: "1px",
});

export const radii = stylex.defineConsts({
  full: "100%",
  lg: "6px",
  md: "4px",
  xl: "8px",
});

export const spacing = stylex.defineConsts({
  control: "32px",
  huge: "24px",
  lg: "8px",
  md: "4px",
  sm: "2px",
  xl: "16px",
  xs: "1px",
});

export const text = stylex.defineConsts({
  base: "16px",
  huge: "80px",
  lg: "24px",
  md: "16px",
  mega: "100px",
  sm: "14px",
  xl: "60px",
  xs: "10px",
});

export const typeface = stylex.defineConsts({
  ui: `"Inter Variable", system-ui, sans-serif`,
});
