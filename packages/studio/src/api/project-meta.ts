import path from "node:path";

import { loadJson, writeJSON, writeJSONWithSchema } from "@liqvid/cli/utils";
import { Duration } from "@liqvid/duration";
import { AutoGenProjectMeta } from "@liqvid/schemas";
import { Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { AbsoluteDir, type AbsoluteFile, type RelativeDir } from "effect-paths";

import { NEXT_PAGE, PROJECT_FILE, PROJECT_META_FILE } from "#_/conventions";
import { getServerState } from "#_/initialize";
import { regenerateProjectFiles } from "#_/services/watch-assets";
import { renameChosenRecording } from "#_/utils/chosen-recordings";
import { existenceOptional } from "#_/utils/effect";
import { NotFoundError } from "#_/utils/errors";
import { getRoutesDir } from "#_/utils/misc";
import { getParameterizedAssetsDir } from "#_/utils/parameters";

import { WebApi } from "./contract.ts";

export const projectMetaLive = HttpApiBuilder.group(
  WebApi,
  "projects",
  (handlers) =>
    handlers
      .handle("regenerateFiles", ({ query: { projectPath } }) =>
        Effect.gen(function* () {
          if (!Object.hasOwn(getServerState().projects, projectPath)) {
            return yield* new NotFoundError({
              message: `No project at ${projectPath}`,
            });
          }

          const fs = yield* FileSystem.FileSystem;
          const projectDir = path.join(getRoutesDir(), projectPath);

          const { hasPage, hasProject } = yield* Effect.all({
            hasPage: fs.exists(path.join(projectDir, NEXT_PAGE)),
            hasProject: fs.exists(path.join(projectDir, PROJECT_FILE)),
          });

          if (!hasPage || !hasProject) {
            return yield* new NotFoundError({
              message: `No project at ${projectPath}`,
            });
          }

          return yield* regenerateProjectFiles(AbsoluteDir(projectDir)).pipe(
            Effect.orDie,
          );
        }).pipe(
          Effect.annotateLogs({ operation: "regenerateFiles", projectPath }),
          Effect.catchTag("PlatformError", Effect.die),
        ),
      )
      .handle(
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

            // read the existing meta so other fields (e.g. chosenRecordings)
            // are preserved
            const existing = yield* loadJson(
              AutoGenProjectMeta,
              projectMetaFile,
            ).pipe(
              existenceOptional,
              Effect.catchTag("FileDecodeError", () =>
                Effect.succeed(Option.none<AutoGenProjectMeta>()),
              ),
            );

            yield* writeJSONWithSchema(AutoGenProjectMeta, projectMetaFile, {
              ...Option.getOrUndefined(existing),
              duration: Duration.from({
                milliseconds: payload.durationMs,
              }).toJSON("short"),
            });
          }).pipe(
            Effect.annotateLogs({
              operation: "setProjectMeta",
            }),
            Effect.catchTag("PlatformError", Effect.die),
          ),
      ),
);

/** Update chosen-recording keys after the corresponding directory is renamed. */
export const renameRecordingInProjectMeta = Effect.fnUntraced(function* (
  projectMetaFile: AbsoluteFile,
  oldName: RelativeDir,
  newName: RelativeDir,
) {
  const existing = yield* loadJson(AutoGenProjectMeta, projectMetaFile).pipe(
    existenceOptional,
  );

  if (Option.isNone(existing)) return;

  const chosenRecordings = renameChosenRecording(
    existing.value.chosenRecordings,
    oldName,
    newName,
  );

  if (chosenRecordings === existing.value.chosenRecordings) return;

  yield* writeJSON<AutoGenProjectMeta>(projectMetaFile, {
    ...existing.value,
    chosenRecordings,
  });
});
