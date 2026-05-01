declare global {
  // biome-ignore lint/suspicious/noExplicitAny: https://github.com/mathjax/MathJax/issues/2197#issuecomment-531566828
  const MathJax: any;
}

export { MathJaxProvider } from "./context.tsx";
export * from "./fancy.tsx";
export { MathJaxReady } from "./loading.ts";
export * from "./macros.ts";
export type { Handle } from "./plain.tsx";
