"use client";

import type { RootParameters } from "@liqvid/schemas";
import { useMemo } from "react";
import Cookies from "universal-cookie";

import { ROOT_PARAMS_COOKIE } from "#_/cookies.js";

import listStyles from "./ProjectList.module.css";
import styles from "./share.module.css";

interface ParameterSelectorProps {
  /** Callback when parameter values change */
  onParamsChange: (params: Record<string, string>) => void;
  /** Parameter definitions from project.json or liqvid.json */
  parameters: RootParameters;
  /** Currently selected parameter values */
  selectedParams: Record<string, string>;
}

/**
 * A row of dropdowns for selecting parameter values.
 * Displayed above the tabs in the Media dialog when a project has parameters.
 */
export function ParameterSelector({
  parameters,
  selectedParams,
  onParamsChange,
}: ParameterSelectorProps) {
  const paramEntries = useMemo(
    () => Object.entries(parameters).filter(([, values]) => values.length > 0),
    [parameters],
  );

  if (paramEntries.length === 0) {
    return null;
  }

  return (
    <div className={styles.parameterSelector}>
      {paramEntries.map(([paramName, values]) => (
        <label className={styles.parameterField} key={paramName}>
          <span className={styles.parameterLabel}>{paramName}</span>
          <select
            className={styles.parameterSelect}
            onChange={(e) => {
              onParamsChange({
                ...selectedParams,
                [paramName]: e.target.value,
              });
            }}
            value={selectedParams[paramName] ?? values[0]}
          >
            {values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

interface RootParameterSelectorProps {
  /** Callback when root parameter values change */
  onRootParamsChange: (params: Record<string, string>) => void;
  /** Root parameter definitions from liqvid.json */
  rootParameters: RootParameters;
  /** Currently selected root parameter values */
  selectedRootParams: Record<string, string>;
}

const cookieOptions = {
  maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
  path: "/",
  sameSite: "lax" as const,
};

/**
 * A row of dropdowns for selecting root parameter values.
 * Displayed at the top of the project list page.
 * Persists selection to a server-side cookie.
 */
export function RootParameterSelector({
  rootParameters,
  selectedRootParams,
  onRootParamsChange,
}: RootParameterSelectorProps) {
  const paramEntries = useMemo(
    () =>
      Object.entries(rootParameters).filter(([, values]) => values.length > 0),
    [rootParameters],
  );

  if (paramEntries.length === 0) {
    return null;
  }

  function handleChange(paramName: string, value: string) {
    const newParams = { ...selectedRootParams, [paramName]: value };
    onRootParamsChange(newParams);

    // Persist to cookie
    const cookies = new Cookies();
    cookies.set(ROOT_PARAMS_COOKIE, JSON.stringify(newParams), cookieOptions);
  }

  return (
    <div className={listStyles.rootParameterSelector}>
      {paramEntries.map(([paramName, values]) => (
        <label className={listStyles.rootParameterField} key={paramName}>
          <span className={listStyles.rootParameterLabel}>{paramName}</span>
          <select
            className={listStyles.rootParameterSelect}
            onChange={(e) => handleChange(paramName, e.target.value)}
            value={selectedRootParams[paramName] ?? values[0]}
          >
            {values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

/**
 * Hook to get the parameter values from the current project context,
 * merged with project-level parameter definitions.
 */
export function useProjectParameterValues(
  projectParameters?: Record<string, string[]>,
  rootParameters?: RootParameters,
): Record<string, string[]> {
  return useMemo(() => {
    // Start with root parameters as fallback
    const params: Record<string, string[]> = { ...rootParameters };

    // Project parameters override root parameters
    if (projectParameters) {
      for (const [key, values] of Object.entries(projectParameters)) {
        params[key] = values;
      }
    }

    return params;
  }, [projectParameters, rootParameters]);
}

/**
 * Get default parameter values (first value of each parameter).
 */
export function getDefaultParams(
  parameters: Record<string, string[]>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, values] of Object.entries(parameters)) {
    if (values.length > 0) {
      result[key] = values[0]!;
    }
  }
  return result;
}
