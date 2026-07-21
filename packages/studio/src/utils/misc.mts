import type { EnvFiles } from "@liqvid/schemas";
import { type LogLevel, Option } from "effect";
import { RelativeDir } from "effect-paths";

import { getServerState } from "../initialize.mts";

/** Pending debounced calls to generateProjectTypes, keyed by assetsDir */
const pendingCalls = new Map<string, NodeJS.Timeout>();

/**
 * Debounce function calls, grouped by a key.
 */
export function debounce(callback: () => void, key: string, debounceMs = 100) {
  const pendingTimeout = pendingCalls.get(key);
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
  }

  pendingCalls.set(
    key,
    setTimeout(() => {
      pendingCalls.delete(key);
      callback();
    }, debounceMs),
  );
}
/**
 * Interpolate environment variable placeholders in a string.
 * Supports:
 *   - {env:VAR_NAME} - reads from process.env
 *   - {env:production:VAR_NAME} - reads from .env.production
 *   - {env:development:VAR_NAME} - reads from .env.development
 */
export function interpolateEnvVars(str: string, envFiles: EnvFiles): string {
  // Match {env:VAR_NAME} or {env:environment:VAR_NAME}
  return str.replace(/\{env:([^}]+)\}/g, (_match, content: string) => {
    const parts = content.split(":");

    if (parts.length === 1) {
      // {env:VAR_NAME} - use process.env
      const varName = parts[0]!;
      const value = process.env[varName];
      if (value === undefined) {
        throw new Error(`Environment variable ${varName} is not set`);
      }
      return value;
    } else if (parts.length === 2) {
      // {env:environment:VAR_NAME}
      const [environment, varName] = parts as [string, string];

      if (environment === "production") {
        const value = envFiles.production[varName] ?? process.env[varName];
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} is not set in .env.production or process.env`,
          );
        }
        return value;
      } else if (environment === "development") {
        const value = envFiles.development[varName] ?? process.env[varName];
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} is not set in .env.development or process.env`,
          );
        }
        return value;
      } else {
        throw new Error(
          `Invalid environment "${environment}" in placeholder. Use "production" or "development".`,
        );
      }
    } else {
      throw new Error(
        `Invalid environment variable placeholder: {env:${content}}`,
      );
    }
  });
}

export function getLogLevel(): LogLevel.LogLevel {
  const { config } = getServerState();

  const level = Option.flatMapNullishOr(
    config,
    (cfg) => cfg.logging?.level,
  ).pipe(Option.getOrElse(() => "info"));

  switch (level) {
    case "debug":
      return "All";
    default:
      return "Info";
  }
}

export const UP = RelativeDir("..");
