declare global {
  // alas: https://github.com/mathjax/MathJax/issues/2197#issuecomment-531566828
  const MathJax: any;
}

export {MathJaxReady} from "./loading";
export {Handle} from "./plain";
export * from "./fancy";
export {RenderGroup} from "./RenderGroup";
