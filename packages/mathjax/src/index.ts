declare global {
  // biome-ignore lint/suspicious/noExplicitAny: https://github.com/mathjax/MathJax/issues/2197#issuecomment-531566828
  const MathJax: any;
}

export { MathJaxProvider } from "./context";
export * from "./fancy";
export { MathJaxReady } from "./loading";
export * from "./macros";
export type { Handle } from "./plain";
