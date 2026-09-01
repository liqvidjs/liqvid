import path from "node:path";

import { writeJSON } from "@liqvid/cli/utils";
import { Effect, FileSystem } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { AbsoluteDir } from "effect-paths";

import { PROJECT_META_FILE } from "#_/conventions.mjs";
import { getRoutesDir } from "#_/utils/misc.mjs";
import { getParameterizedAssetsDir } from "#_/utils/parameters.mjs";

import { WebApi } from "./contract.mts";

export const projectMetaLive = HttpApiBuilder.group(
  WebApi,
  "projects",
  (handlers) =>
    handlers.handle(
      "setProjectMeta",
      ({ payload, query: { projectPath, params: paramsJson } }) =>
        Effect.gen(function* () {
          // Parse params if provided
          const params = paramsJson
            ? (JSON.parse(paramsJson) as Record<string, string>)
            : undefined;

          const routesDir = getRoutesDir();
          const assetsDir = getParameterizedAssetsDir(
            routesDir as AbsoluteDir,
            projectPath,
            params,
          );
          const projectMetaFile = path.join(assetsDir, PROJECT_META_FILE);

          const fs = yield* FileSystem.FileSystem;

          // error if assets dir doesn't exist
          if (!(yield* fs.exists(assetsDir))) {
            return yield* Effect.die({
              message: "assets dir does not exist",
            });
          }

          yield* writeJSON(projectMetaFile, {
            duration: { milliseconds: payload.durationMs },
          });
        }).pipe(
          Effect.annotateLogs({
            operation: "setProjectMeta",
          }),
          Effect.catchTag("PlatformError", Effect.die),
        ),
    ),
);
