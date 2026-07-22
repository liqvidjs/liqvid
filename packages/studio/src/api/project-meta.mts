import path from "node:path";

import { writeJSON } from "@liqvid/cli/utils";
import { Effect, FileSystem } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { ASSETS_DIR, PROJECT_META_FILE } from "../conventions.mts";
import { inRoutesDir } from "../utils/misc.mts";

import { WebApi } from "./contract.mts";

export const projectMetaLive = HttpApiBuilder.group(
  WebApi,
  "projects",
  (handlers) =>
    handlers.handle("setProjectMeta", ({ payload, query: { projectPath } }) =>
      Effect.gen(function* () {
        const assetsDir = inRoutesDir(projectPath, ASSETS_DIR);
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
