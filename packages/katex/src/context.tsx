"use client";

import { createContext, useContext, useMemo } from "react";

import { parseMacros } from "./macros";

const KaTeXContext = createContext<katex.KatexOptions>({});

export function useKaTeXContext() {
  return useContext(KaTeXContext);
}

export function KaTeXProvider({
  children,
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
  strict = "ignore",
  throwOnError = false,
  trust = true,
}: {
  children?: React.ReactNode;
  macros?: string | Record<string, string>;
} & katex.KatexOptions) {
  const context = useMemo<katex.KatexOptions>(() => {
    if (typeof macros === "string") {
      macros = parseMacros(macros);
    }
    return {
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
    };
  }, [
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

  return (
    <KaTeXContext.Provider value={context}>{children}</KaTeXContext.Provider>
  );
}
