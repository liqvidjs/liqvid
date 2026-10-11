import * as path from "node:path";

import { loadJson } from "@liqvid/cli/utils";
import {
  inlineTypeDeclaration,
  writeTypedJson,
} from "@liqvid/studio-plugin-api/server";
import { Effect, FileSystem, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { type AbsoluteDir, RelativeFile } from "effect-paths";

import { ASSETS_DIR, HIGHLIGHTS_FILE } from "#_/conventions";
import { getRoutesDir } from "#_/utils/misc";
import {
  ensureParamsMarker,
  extractParameterNames,
  getParameterizedAssetsDir,
} from "#_/utils/parameters";

import { WebApi } from "./contract.ts";
import { HighlightEntry } from "./schemas.ts";

const HIGHLIGHTS_ARRAY = Schema.Array(HighlightEntry);

/** Type exported into the adjacent `.d.json.ts` file for `highlights.json` */
const HIGHLIGHTS_DECLARATION = inlineTypeDeclaration(
  `import("liqvid").Controls.VideoHighlight[]`,
);

export const highlightsLive = HttpApiBuilder.group(
  WebApi,
  "highlights",
  (handlers) =>
    handlers
      .handle("list", ({ query: { projectPath, params: paramsJson } }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;

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

          const filename = path.join(assetsDir, HIGHLIGHTS_FILE);

          if (!(yield* fs.exists(filename))) {
            return { highlights: [] };
          }

          const highlights = yield* loadJson(HIGHLIGHTS_ARRAY, filename);

          return { highlights };
        }).pipe(
          Effect.catchTags({
            FileDecodeError: Effect.die,
            PlatformError: Effect.die,
          }),
        ),
      )
      .handle(
        "save",
        ({
          query: { projectPath, params: paramsJson },
          payload: { highlights },
        }) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            // Parse params if provided
            const params = paramsJson
              ? (JSON.parse(paramsJson) as Record<string, string>)
              : undefined;

            const routesDir = getRoutesDir();

            // Ensure params marker exists for parameterized projects
            const paramNames = extractParameterNames(projectPath);
            if (paramNames.length > 0) {
              const baseAssetsDir = path.join(
                routesDir,
                projectPath,
                ASSETS_DIR,
              );
              yield* ensureParamsMarker(
                baseAssetsDir as AbsoluteDir,
                projectPath,
              );
            }

            const assetsDir = getParameterizedAssetsDir(
              routesDir as AbsoluteDir,
              projectPath,
              params,
            );

            yield* fs.makeDirectory(assetsDir, { recursive: true });

            // Skip identical writes: a redundant save (e.g. overwriting a
            // highlight with the time it already has) must not produce file
            // events, or else the dev server churns the importing modules.
            const jsonContents = JSON.stringify(highlights, null, 2);
            const jsonPath = path.join(assetsDir, HIGHLIGHTS_FILE);
            const dtsPath = path.join(
              assetsDir,
              RelativeFile("highlights.d.json.ts"),
            );

            const [$existingJson, $existingDts] = yield* Effect.all([
              fs.readFileString(jsonPath, "utf8").pipe(Effect.option),
              fs.readFileString(dtsPath, "utf8").pipe(Effect.option),
            ]);

            const unchanged =
              Option.isSome($existingJson) &&
              Option.isSome($existingDts) &&
              $existingJson.value === jsonContents &&
              $existingDts.value === HIGHLIGHTS_DECLARATION;

            if (!unchanged) {
              yield* writeTypedJson({
                data: highlights,
                declaration: HIGHLIGHTS_DECLARATION,
                dirname: assetsDir,
                filename: HIGHLIGHTS_FILE,
                pretty: true,
              });
            }
          }).pipe(
            Effect.catchTags({
              PlatformError: Effect.die,
            }),
          ),
      ),
);
