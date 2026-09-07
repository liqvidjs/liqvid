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
export function useProjectParamsOptional<
  PP extends Record<string, string> = Record<string, string>,
>(): PP | null {
  return useContext(projectParamsContext) as PP | null;
}

/**
 * Get the current project parameter values.
 * Returns an empty object if not in a parameterized project.
 */
export function useProjectParams<
  PP extends Record<string, string> = Record<string, string>,
>(): PP {
  const value = useProjectParamsOptional<PP>();
  return value ?? ({} as PP);
}

export const ProjectParamsProvider = projectParamsContext.Provider;
