"use client";

import type { RootParameters } from "@liqvid/schemas";
import * as stylex from "@stylexjs/stylex";
import type { ReadonlyRecord } from "effect/Record";
import { useMemo } from "react";
import Cookies from "universal-cookie";

import { ROOT_PARAMS_COOKIE } from "#_/cookies.js";
import { colors, radii, spacing } from "#_/design/tokens.stylex.js";

import { projectListStyles } from "./projectList.sx.ts";

interface ParameterSelectorProps {
  /** Callback when parameter values change */
  onParamsChange: (params: ReadonlyRecord<string, string>) => void;

  /** Parameter definitions from project.json or liqvid.json */
  parameters: RootParameters;

  /** Currently selected parameter values */
  selectedParams: ReadonlyRecord<string, string>;
}

const styles = stylex.create({
  parameterField: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },
  parameterLabel: {
    color: colors.grayDim,
    fontSize: "0.75rem",
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
    borderWidth: "1px",
    color: colors.grayNormal,
    cursor: "pointer",
    fontSize: "0.8125rem",
    outline: {
      ":focus": "none",
    },
    paddingBlock: "0.375rem",
    paddingInline: "0.625rem",
  },

  parameterSelector: {
    alignItems: "center",
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    display: "flex",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
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
    <div {...stylex.props(styles.parameterSelector)}>
      {paramEntries.map(([paramName, values]) => (
        <label {...stylex.props(styles.parameterField)} key={paramName}>
          <span {...stylex.props(styles.parameterLabel)}>{paramName}</span>
          <select
            {...stylex.props(styles.parameterSelect)}
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
  "use no memo";
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
    <div {...stylex.props(projectListStyles.rootParameterSelector)}>
      {paramEntries.map(([paramName, values]) => (
        <label
          key={paramName}
          {...stylex.props(projectListStyles.rootParameterField)}
        >
          <span
            {...stylex.props(projectListStyles.rootParameterLabel)}
            key="???"
          >
            {paramName}
          </span>
          <select
            {...stylex.props(projectListStyles.rootParameterSelect)}
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
  projectParameters?: ReadonlyRecord<string, string[]>,
  rootParameters?: RootParameters,
): ReadonlyRecord<string, readonly string[]> {
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
  parameters: ReadonlyRecord<string, readonly string[]>,
): ReadonlyRecord<string, string> {
  const result: Record<string, string> = {};
  for (const [key, values] of Object.entries(parameters)) {
    if (values.length > 0) {
      result[key] = values[0]!;
    }
  }
  return result;
}
