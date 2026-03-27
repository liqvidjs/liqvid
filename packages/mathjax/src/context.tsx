"use client";

import { createContext, useContext, useMemo } from "react";

import { parseMacros } from "./macros";

export interface MathJaxContext {
  macros: Record<string, string>;
}

export const MathJaxContext = createContext<MathJaxContext>({
  macros: {},
});

export function useMathJaxContext() {
  return useContext(MathJaxContext);
}

export function MathJaxProvider({
  children,
  macros,
}: {
  children?: React.ReactNode;
  macros?: string | Record<string, string>;
}) {
  const context = useMemo<MathJaxContext>(() => {
    if (typeof macros === "string") {
      return {
        macros: parseMacros(macros),
      };
    } else if (typeof macros === "object" && macros !== null) {
      return { macros };
    }

    return { macros: {} };
  }, [macros]);

  return (
    <MathJaxContext.Provider value={context}>
      {children}
    </MathJaxContext.Provider>
  );
}
