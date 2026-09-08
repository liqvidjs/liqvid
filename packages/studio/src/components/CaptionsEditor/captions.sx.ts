import * as stylex from "@stylexjs/stylex";

import { colors } from "#_/design/tokens.stylex.js";

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  actions: {
    alignItems: "center",
    display: "flex",
    gap: "0.5em",
  },

  activeWord: {
    background: "transparent",
    borderRadius: "3px",
    color: colors.accentSolid,
  },
  CaptionsEditor: {
    height: "max-content",
    maxWidth: "unset",
    width: "max-content",
  },

  captionBreak: {
    "::after": {
      background: "gray",
      content: '""',
      display: "inline-block",
      height: "1em",
      verticalAlign: "middle",
      width: "1px",
    },
    position: "relative",
  },

  hoverWord: {
    background: "light-dark(rgba(0, 0, 0, 8%), rgba(255, 255, 255, 10%))",
    borderRadius: "2px",
    boxSizing: "content-box",
    paddingBlock: '1px',
    paddingInline: '2px',
    pointerEvents: "none",
    position: "absolute",
    translate: "-2px -1px",
    zIndex: 1,
  },

  preview: {
    background: "light-dark(#000d, #222d)",
    borderRadius: "8px",
    bottom: "10%",
    color: "#fff",
    left: "50%",
    paddingBlock: '0.4em',
    paddingInline: '0.8em',
    pointerEvents: "none",
    position: "absolute",
    translate: "-50% 0",
    width: "max-content",
    zIndex: 10,
  },

  selection: {
    "::before": {
      background: "light-dark(#acf, #79e)",
      borderRadius: "2px",
      boxSizing: "content-box",
      content: '""',
      height: "100%",
      left: 0,
      marginBlock: '-1px',
      marginInline: '-4px',
      paddingBlock: '1px',
      paddingInline: '4px',
      position: "absolute",
      top: 0,
      width: "100%",
      zIndex: -1,
    },
    background: "light-dark(#acf, #79e)",
    color: "inherit",
    position: "relative",
    zIndex: 0,
  },

  spinner: {
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationName: spin,
    animationTimingFunction: "linear",
  },

  stripes: {
    backgroundImage:
      `repeating-linear-gradient(light-dark(#f6f6f6, #333) 0,light-dark(#f6f6f6, #333) calc(1.5em - 1px),light-dark(#ddd, #4a4a4a) calc(1.5em - 1px),light-dark(#ddd, #4a4a4a) calc(1.5em),light-dark(#e8e8e8, #3f3f3f) calc(1.5em),light-dark(#e8e8e8, #3f3f3f) calc(3em - 1px),light-dark(#ddd, #4a4a4a) calc(3em - 1px),light-dark(#ddd, #4a4a4a) calc(3em))`,
    cursor: "pointer",
    paddingBlock: '0',
    paddingInline: '4px',
    position: "relative",
  },

  time: {
    color: colors.grayDim,
    fontFamily: "monospace",
    fontSize: "0.8em",
    marginBlock: '0.5em',
    marginInline: '0',
  },

  transcript: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.graySep,
    borderRadius: "2px",
    height: "50vh",
    lineHeight: 1.5,
    marginBlock: '0.5em',
    marginInline: '0',
    overflow: "auto",
    width: "75vw",
  },

  wordInput: {
    background: colors.grayApp,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.accentSolid,
    borderRadius: "2px",
    color: "inherit",
    font: "inherit",
    minWidth: "4em",
    outline: "none",
    paddingBlock: '1px',
    paddingInline: '2px',
    position: "absolute",
    translate: "-2px -1px",
    zIndex: 2,
  },
});
