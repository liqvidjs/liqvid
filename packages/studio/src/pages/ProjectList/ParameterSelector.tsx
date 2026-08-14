"use client";

import type { RootParameters } from "@liqvid/schemas";
import { useProjectParams } from "@liqvid/studio-plugin-api";
import { useMemo } from "react";

import styles from "./share.module.css";

interface ParameterSelectorProps {
  /** Parameter definitions from project.json or liqvid.json */
  parameters: RootParameters;
  /** Currently selected parameter values */
  selectedParams: Record<string, string>;
  /** Callback when parameter values change */
  onParamsChange: (params: Record<string, string>) => void;
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
        <label key={paramName} className={styles.parameterField}>
          <span className={styles.parameterLabel}>{paramName}</span>
          <select
            className={styles.parameterSelect}
            value={selectedParams[paramName] ?? values[0]}
            onChange={(e) => {
              onParamsChange({
                ...selectedParams,
                [paramName]: e.target.value,
              });
            }}
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
  const contextParams = useProjectParams();

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
