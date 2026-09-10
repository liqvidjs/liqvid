import "server-only";

import path from "node:path";

import type { LiqvidConfig, RenderSource } from "@liqvid/schemas";
import { Effect, type LogLevel, Option } from "effect";
import type { RelativeDir } from "effect-paths";
import { headers } from "next/headers";

import { NEXT_APP_DIR } from "#_/conventions.mjs";
import { getServerState } from "#_/initialize.mjs";

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

/**
 * Get the absolute path to the routes directory.
 */
export function getRoutesDir() {
  const { cwd } = getServerState();
  return path.join(cwd, NEXT_APP_DIR);
}

/** Read the resolved LiqvidConfig from server state, or die if not loaded. */
export function getConfig() {
  return getServerState().config.pipe(
    Option.match({
      onNone: () => Effect.die({ message: "config not loaded" }),
      onSome: (value: LiqvidConfig) => Effect.succeed(value),
    }),
  );
}

const getOrigin = Effect.fnUntraced(function* () {
  const headersList = yield* Effect.promise(headers);

  const origin = headersList.get("origin");
  if (!origin) {
    return yield* Effect.die({
      message: "Origin header is missing",
    });
  }

  return origin;
});

/**
 * Interpolate path parameters (like `[lang]`) with their actual values.
 */
function interpolatePathParams(
  urlPath: string,
  params?: Record<string, string>,
): string {
  if (!params) return urlPath;
  return urlPath.replace(/\[([^\]]+)\]/g, (match, paramName: string) => {
    return params[paramName] ?? match;
  });
}

export const getRenderUrl = Effect.fnUntraced(function* (
  renderSource: RenderSource,
  projectPath: RelativeDir,
  params?: Record<string, string>,
) {
  const origin = yield* getOrigin();

  const { basePath, productionServerPort } = getServerState();

  // Interpolate path parameters (e.g., [lang] -> "en")
  const interpolatedPath = interpolatePathParams(projectPath, params);

  if (renderSource === "preview") {
    return `${origin}/${interpolatedPath}?preview`;
  } else {
    const previewPath = `${basePath || ""}/${interpolatedPath}/`;
    return `http://localhost:${productionServerPort}${previewPath}`;
  }
});

/**
 * Generate cartesian product of possible parameter values.
 */
export function cartesianProduct<T extends Record<string, readonly string[]>>(
  parameters: T,
): Array<{
  [K in keyof T]: T[K][number];
}> {
  const keys = Object.keys(parameters) as (keyof T)[];

  if (keys.length === 0) return [];

  return keys.reduce<Array<Record<string, string>>>(
    (acc, key) => {
      const values = parameters[key]!;
      return acc.flatMap((obj) =>
        values.map((value) => ({ ...obj, [key]: value })),
      );
    },
    [{}],
  ) as Array<{
    [K in keyof T]: T[K][number];
  }>;
}
