"use client";

import { createContext, useContext } from "react";

const isPreviewContext = createContext<boolean | null>(null);
isPreviewContext.displayName = "IsPreview";

export function useIsPreviewOptional() {
  return useContext(isPreviewContext);
}

export function useIsPreview() {
  const value = useIsPreviewOptional();
  if (value === null) {
    throw new Error(
      "useIsPreview must be used within an IsPreviewProvider. It should only be called in development mode.",
    );
  }
  return value;
}

export const IsPreviewProvider = isPreviewContext.Provider;
