import { use } from "react";

import { createUniqueContext } from "./utils.client.mts";

/**
 * Context for project parameter values.
 * Used for parameterized projects (e.g., `/[lang]/[locale]/project`)
 * to provide the current parameter values to descendants.
 */
export const projectParamsContext = createUniqueContext<Record<
  string,
  string
> | null>("@liqvid/studio-plugin-api/ProjectParams", null, "ProjectParams");

/**
 * Get the current project parameter values, or null if not in a parameterized project.
 */
export function useProjectParamsOptional<
  PP extends Record<string, string> = Record<string, string>,
>(): PP | null {
  return use(projectParamsContext) as PP | null;
}

/**
 * Get the current project parameter values.
 * Returns an empty object if not in a parameterized project.
 */
export function useProjectParams<
  PP extends Record<string, string> = Readonly<Record<string, string>>,
>(): PP {
  const value = useProjectParamsOptional<PP>();
  return value ?? ({} as PP);
}
