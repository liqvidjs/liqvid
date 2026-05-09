import type { RenderMathInElementOptions } from "katex/contrib/auto-render";

export type BetterKaTeXOptions = katex.KatexOptions & {
  // there is some inconsistency with the KaTeX types
  strict?:
    | boolean
    | "ignore"
    | "warn"
    | "error"
    | katex.StrictFunction
    | undefined;

  trust?: boolean | ((context: katex.TrustContext) => boolean);
};

export type BetterRenderMathInElementOptions = RenderMathInElementOptions &
  BetterKaTeXOptions;
