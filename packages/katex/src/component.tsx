"use client";

import { combineRefs, useFirstRender } from "@liqvid/utils";
import { Slot } from "@radix-ui/react-slot";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import { useEffect, useRef } from "react";

import { useKaTeXContext } from "./context.tsx";
import type { BetterKaTeXOptions } from "./types.ts";

/** Component for KaTeX code */
export function KTX({
  children,
  overwriteMacros = false,
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
}: BetterKaTeXOptions &
  React.JSX.IntrinsicElements["span"] & {
    children: string;

    /**
     * By default, the `macros` prop will merge with existing macros defined in the context.
     * If this is set to true, it will instead overwrite all macros.
     */
    overwriteMacros?: boolean;
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
      macros: overwriteMacros
        ? (macros ?? defaults.macros)
        : { ...defaults.macros, ...macros },
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
    overwriteMacros,
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
      <span ref={combineRefs(ref, propRef)} {...props}>
        {tex}
      </span>
    );
  }

  return <span ref={combineRefs(ref, propRef)} {...props} />;
}

/** Component for KaTeX code */
export function RenderMathInElement({
  children,

  // katex options
  colorIsTextColor,
  delimiters,
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
  errorCallback,
  ignoredClasses,
  ignoredTags,
}: renderMathInElement.RenderMathInElementOptions & {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  const defaults = useKaTeXContext();

  useEffect(() => {
    if (!ref.current) return;

    children;

    renderMathInElement(ref.current, {
      colorIsTextColor: colorIsTextColor ?? defaults.colorIsTextColor,
      delimiters,
      displayMode: displayMode ?? defaults.displayMode,

      errorCallback,
      errorColor: errorColor ?? defaults.errorColor,
      fleqn: fleqn ?? defaults.fleqn,
      globalGroup: globalGroup ?? defaults.globalGroup,
      ignoredClasses,
      ignoredTags,
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
    defaults,

    // katex options
    children,
    colorIsTextColor,
    delimiters,
    displayMode,
    errorCallback,
    errorColor,
    fleqn,
    globalGroup,
    ignoredClasses,
    ignoredTags,
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

  return <Slot ref={ref}>{children}</Slot>;
}
