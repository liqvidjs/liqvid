"use client";

import { createContext, useContext, useMemo } from "react";

import { parseMacros } from "./macros.ts";
import type { BetterRenderMathInElementOptions } from "./types.ts";

const KaTeXContext = createContext<BetterRenderMathInElementOptions>({});

export function useKaTeXContext() {
  return useContext(KaTeXContext);
}

export function KaTeXProvider({
  overwriteMacros = false,

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
  strict = "ignore",
  throwOnError = false,
  trust = true,
}: {
  children?: React.ReactNode;
  macros?: string | Record<string, string>;
  /**
   * By default, the `macros` prop will merge with existing macros defined in the context.
   * If this is set to true, it will instead overwrite all macros.
   */
  overwriteMacros?: boolean;
} & BetterRenderMathInElementOptions) {
  const existing = useKaTeXContext();

  const context = useMemo<BetterRenderMathInElementOptions>(() => {
    if (typeof macros === "string") {
      macros = parseMacros(macros);
    }

    return {
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
      macros: overwriteMacros ? macros : { ...existing?.macros, ...macros },
      maxExpand,
      maxSize,
      minRuleThickness,
      output,
      strict,
      throwOnError,
      trust,
    };
  }, [
    colorIsTextColor,
    delimiters,
    displayMode,
    errorCallback,
    errorColor,
    existing?.macros,
    overwriteMacros,
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

  return (
    <KaTeXContext.Provider value={context}>{children}</KaTeXContext.Provider>
  );
}
