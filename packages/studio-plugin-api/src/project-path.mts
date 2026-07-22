"use client";

import type { RelativeDir } from "effect-paths";
import { createContext, useContext } from "react";

const projectPathContext = createContext<RelativeDir | null>(null);
projectPathContext.displayName = "ProjectPath";

export function useProjectPathOptional(): RelativeDir | null {
  return useContext(projectPathContext);
}

export function useProjectPath(): RelativeDir {
  const value = useProjectPathOptional();
  if (typeof value !== "string") {
    throw new Error("useProjectPath must be used within a ProjectPathProvider");
  }

  return value;
}

export const ProjectPathProvider = projectPathContext.Provider;
