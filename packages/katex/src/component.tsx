"use client";

import { combineRefs, useFirstRender } from "@liqvid/utils";
import katex from "katex";
import { useEffect, useRef } from "react";

import { useKaTeXContext } from "./context";

/** Component for KaTeX code */
export const KTX = function KTX({
  children,
  ref: propRef,

  // katex options
  colorIsTextColor,
  displayMode,
  errorColor,
  fleqn,
  globalGroup,
  leqno,
  macros,
  maxExpand,
  maxSize,
  minRuleThickness,
  output,
  strict,
  throwOnError,
  trust,
  ...props
}: katex.KatexOptions &
  React.JSX.IntrinsicElements["span"] & {
    children: string;
  }) {
  const ref = useRef(null);

  const defaults = useKaTeXContext();

  const isFirstRender = useFirstRender();

  useEffect(() => {
    if (!ref.current) return;

    // needed for initial client render
    isFirstRender;

    katex.render(children, ref.current, {
      colorIsTextColor: colorIsTextColor ?? defaults.colorIsTextColor,
      displayMode: displayMode ?? defaults.displayMode,
      errorColor: errorColor ?? defaults.errorColor,
      fleqn: fleqn ?? defaults.fleqn,
      globalGroup: globalGroup ?? defaults.globalGroup,
      leqno: leqno ?? defaults.leqno,
      macros: macros ?? defaults.macros,
      maxExpand: maxExpand ?? defaults.maxExpand,
      maxSize: maxSize ?? defaults.maxSize,
      minRuleThickness: minRuleThickness ?? defaults.minRuleThickness,
      output: output ?? defaults.output,
      strict: strict ?? defaults.strict,
      throwOnError: throwOnError ?? defaults.throwOnError,
      trust: trust ?? defaults.trust,
    });
  }, [
    children,
    defaults,
    isFirstRender,

    // katex options
    colorIsTextColor,
    displayMode,
    errorColor,
    fleqn,
    globalGroup,
    leqno,
    macros,
    maxExpand,
    maxSize,
    minRuleThickness,
    output,
    strict,
    throwOnError,
    trust,
  ]);

  // ensure that it is server-rendered
  if (isFirstRender) {
    const tex = katex.renderToString(children, {
      colorIsTextColor: colorIsTextColor ?? defaults.colorIsTextColor,
      displayMode: displayMode ?? defaults.displayMode,
      errorColor: errorColor ?? defaults.errorColor,
      fleqn: fleqn ?? defaults.fleqn,
      globalGroup: globalGroup ?? defaults.globalGroup,
      leqno: leqno ?? defaults.leqno,
      macros: macros ?? defaults.macros,
      maxExpand: maxExpand ?? defaults.maxExpand,
      maxSize: maxSize ?? defaults.maxSize,
      minRuleThickness: minRuleThickness ?? defaults.minRuleThickness,
      output: output ?? defaults.output,
      strict: strict ?? defaults.strict,
      throwOnError: throwOnError ?? defaults.throwOnError,
      trust: trust ?? defaults.trust,
    });

    return (
      <span
        dangerouslySetInnerHTML={{
          __html: tex,
        }}
        ref={combineRefs(ref, propRef)}
        {...props}
      />
    );
  }

  return <span ref={combineRefs(ref, propRef)} {...props} />;
};
