"use client";

import type { RootParameters } from "@liqvid/schemas";
import * as stylex from "@stylexjs/stylex";
import { useMemo } from "react";

import {
  colors,
  dims,
  radii,
  scales,
  spacing,
  text,
} from "#_/design/tokens.stylex.js";

interface ParameterSelectorProps {
  /** Callback when parameter values change */
  onParamsChange: (params: Readonly<Record<string, string>>) => void;

  /** Parameter definitions from project.json or liqvid.json */
  parameters: RootParameters;

  /** Currently selected parameter values */
  selectedParams: Readonly<Record<string, string>>;
}

const styles = stylex.create({
  container: {
    alignItems: "center",
    backgroundColor: `light-dark(${scales.stone200}, ${scales.stone700})`,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  parameterField: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },
  parameterLabel: {
    color: colors.grayDim,
    fontSize: text.md,
    fontWeight: 500,
    textTransform: "capitalize",
  },
  parameterSelect: {
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    cursor: "pointer",
    fontSize: text.md,
    outline: {
      ":focus": "none",
      default: null,
    },
    paddingBlock: spacing.sm,
    paddingInline: spacing.sm,
  },
});

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
    <div sx={styles.container}>
      {paramEntries.map(([paramName, values]) => (
        <label key={paramName} sx={styles.parameterField}>
          <span sx={styles.parameterLabel}>{paramName}</span>
          <select
            onChange={(e) => {
              onParamsChange({
                ...selectedParams,
                [paramName]: e.target.value,
              });
            }}
            sx={styles.parameterSelect}
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

/**
 * Hook to get the parameter values from the current project context,
 * merged with project-level parameter definitions.
 */
export function useProjectParameterValues(
  projectParameters?: Readonly<Record<string, readonly string[]>>,
  rootParameters?: RootParameters,
): Readonly<Record<string, readonly string[]>> {
  return useMemo(() => {
    // Start with root parameters as fallback
    const params = { ...rootParameters };

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
  parameters: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [key, values] of Object.entries(parameters)) {
    if (values.length > 0) {
      result[key] = values[0]!;
    }
  }
  return result;
}
