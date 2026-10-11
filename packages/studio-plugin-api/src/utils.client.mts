"use client";

import { createContext } from "react";

export function createUniqueContext<T>(
  key: string,
  defaultValue: T = undefined as T,
  displayName?: string,
): React.Context<T> {
  const symbol = Symbol.for(key);

  if (!(symbol in globalThis)) {
    const context = createContext<T>(defaultValue);
    context.displayName = displayName;
    (globalThis as unknown as { [symbol]: React.Context<T> })[symbol] = context;
  }

  return (globalThis as unknown as { [symbol]: React.Context<T> })[symbol];
}
