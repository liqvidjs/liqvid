"use client";

import { createContext, useContext } from "react";

/**
 * Context for project parameter values.
 * Used for parameterized projects (e.g., `/[lang]/[locale]/project`)
 * to provide the current parameter values to descendants.
 */
const projectParamsContext = createContext<Record<string, string> | null>(null);
projectParamsContext.displayName = "ProjectParams";

/**
 * Get the current project parameter values, or null if not in a parameterized project.
 */
export function useProjectParamsOptional(): Record<string, string> | null {
  return useContext(projectParamsContext);
}

/**
 * Get the current project parameter values.
 * Returns an empty object if not in a parameterized project.
 */
export function useProjectParams(): Record<string, string> {
  const value = useProjectParamsOptional();
  return value ?? {};
}

export const ProjectParamsProvider = projectParamsContext.Provider;
