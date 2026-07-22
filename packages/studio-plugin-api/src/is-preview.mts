"use client";

import { createContext, useContext } from "react";

const isPreviewContext = createContext<boolean>(false);
isPreviewContext.displayName = "IsPreview";

export function useIsPreview() {
  return useContext(isPreviewContext);
}

export const IsPreviewProvider = isPreviewContext.Provider;
