declare global {
  // alas: https://github.com/mathjax/MathJax/issues/2197#issuecomment-531566828
  const MathJax: any
}

export {Handle} from "./plain";
export * from "./NonBlocking";

// import {MJXBlocking, MJXTextBlocking} from "./Blocking";
// export {
//   MJXBlocking as MJX, MJXBlocking,
//   MJXTextBlocking as MJXText, MJXTextBlocking
// };
