import path from "node:path";
import { fileURLToPath } from "node:url";

import { Effect, FileSystem } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { PROJECT_META_FILE } from "../conventions.mts";

import { WebApi } from "./contract-effect.mts";

export const projectMetaLive = HttpApiBuilder.group(
  WebApi,
  "projects",
  (handlers) =>
    handlers.handle("setProjectMeta", ({ payload, query: { url } }) =>
      Effect.gen(function* () {
        let projectPath = fileURLToPath(url);
        if (projectPath.endsWith("page.tsx")) {
          projectPath = path.dirname(projectPath);
        }
        const assetsDir = path.join(projectPath, ".liqvid");
        const projectMetaFile = path.join(assetsDir, PROJECT_META_FILE);

        const fs = yield* FileSystem.FileSystem;

        // error if assets dir doesn't exist
        if (!(yield* fs.exists(assetsDir))) {
          return yield* Effect.die({
            message: "assets dir does not exist",
          });
        }

        yield* fs.writeFileString(
          projectMetaFile,
          JSON.stringify(
            { duration: { milliseconds: payload.durationMs } },
            null,
            2,
          ),
        );
      }).pipe(Effect.orDie),
    ),
);
