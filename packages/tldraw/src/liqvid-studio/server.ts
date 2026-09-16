"use server";

import path from "node:path";

import {
  ASSETS_DIR,
  readDirWithFileTypes,
  resolveProjectPath,
  serverRuntime,
} from "@liqvid/studio/server";
import { packageNameToDirName } from "@liqvid/studio-plugin-api";
import {
  inlineTypeDeclaration,
  writeTypedJson,
} from "@liqvid/studio-plugin-api/server";
import { Cause, Effect, Exit, FileSystem, type PlatformError } from "effect";
import { type RelativeDir, RelativeFile } from "effect-paths";
import type { TLEditorSnapshot } from "tldraw";

import { PACKAGE } from "../version.ts";

import type { SavedState } from "./types.ts";

export async function saveSnapshot(
  projectPath: RelativeDir,
  params: Readonly<Record<string, string>>,
  snapshot: TLEditorSnapshot,
): Promise<SavedState> {
  const pluginDir = getPluginDir(projectPath, params);

  const createdAt = new Date().toISOString();

  return await serverRuntime.runPromise(
    Effect.gen(function* () {
      const newSaved = {
        createdAt,
        name: createdAt,
        snapshot,
      };

      yield* writeTypedJson({
        data: {
          createdAt,
          snapshot,
        },
        declaration: inlineTypeDeclaration(`{
  createdAt: string;
  name: string;
  snapshot: import("tldraw").TLEditorSnapshot;
}`),
        dirname: pluginDir,
        filename: RelativeFile(`${createdAt}.json`),
      });

      return newSaved;
    }),
  );
}

export async function listSaved(
  projectPath: RelativeDir,
  params: Readonly<Record<string, string>>,
): Promise<readonly SavedState[]> {
  const pluginDir = getPluginDir(projectPath, params);

  const exit = await serverRuntime.runPromiseExit(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      yield* fs.makeDirectory(pluginDir, { recursive: true });

      const files = yield* readDirWithFileTypes(pluginDir);

      return yield* Effect.all(
        files.reduce(
          (acc, [filename, kind]) => {
            if (kind !== "File") return acc;

            if (!filename.endsWith(".json")) return acc;

            acc.push(
              Effect.gen(function* () {
                const contents = JSON.parse(
                  yield* fs.readFileString(path.join(pluginDir, filename)),
                ) as Omit<SavedState, "name">;
                return {
                  ...contents,
                  name: filename.slice(0, -".json".length),
                };
              }),
            );

            return acc;
          },
          [] as Effect.Effect<SavedState, PlatformError.PlatformError>[],
        ),
        { concurrency: 10 },
      );
    }).pipe(
      Effect.tapCause((cause) =>
        Effect.logError(`Failed to list saved snapshots`, Cause.pretty(cause)),
      ),
    ),
  );

  if (Exit.isFailure(exit)) {
    throw exit.cause;
  }

  return exit.value;
}

function getPluginDir(
  projectPath: RelativeDir,
  params: Readonly<Record<string, string>>,
) {
  return path.join(
    resolveProjectPath(projectPath),
    ASSETS_DIR,
    ...(Object.values(params) as RelativeDir[]),
    packageNameToDirName(PACKAGE),
  );
}
