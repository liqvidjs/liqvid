"use server";

import path from "node:path";

import type { ParameterValues } from "@liqvid/schemas";
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
import type { TLEditorSnapshot } from "@tldraw/editor";
import { Cause, Effect, Exit, FileSystem, type PlatformError } from "effect";
import { type RelativeDir, RelativeFile } from "effect-paths";

import { PACKAGE } from "../version.ts";

import type { SavedState } from "./types.ts";

export async function saveSnapshot(
  projectPath: RelativeDir,
  params: ParameterValues,
  snapshot: TLEditorSnapshot,
  index: number,
): Promise<SavedState> {
  const pluginDir = getPluginDir(projectPath, params);

  const createdAt = new Date().toISOString();

  const name = `capture${index + 1}`;

  return await serverRuntime.runPromise(
    Effect.gen(function* () {
      const newSaved = {
        createdAt,
        name,
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
  snapshot: import("@tldraw/editor").TLEditorSnapshot;
}`),
        dirname: pluginDir,
        filename: RelativeFile(`${name}.json`),
      });

      return newSaved;
    }),
  );
}

export async function renameSnapshot(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
  newName: string,
): Promise<void> {
  validateName(name);
  validateName(newName);

  const pluginDir = getPluginDir(projectPath, params);

  await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const destination = snapshotPath(pluginDir, newName);

      if (yield* fs.exists(destination)) {
        throw new Error(`A saved state named ${newName} already exists`);
      }

      yield* fs.rename(snapshotPath(pluginDir, name), destination);
    }),
  );
}

export async function deleteSnapshot(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
): Promise<void> {
  validateName(name);

  await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.remove(snapshotPath(getPluginDir(projectPath, params), name));
    }),
  );
}

export async function listSaved(
  projectPath: RelativeDir,
  params: ParameterValues,
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

function snapshotPath(
  pluginDir: ReturnType<typeof getPluginDir>,
  name: string,
) {
  return path.join(pluginDir, RelativeFile(`${name}.json`));
}

function validateName(name: string): void {
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) {
    throw new Error("Saved state names must be a single path segment");
  }
}

function getPluginDir(projectPath: RelativeDir, params: ParameterValues) {
  return path.join(
    resolveProjectPath(projectPath),
    ASSETS_DIR,
    ...(Object.values(params) as RelativeDir[]),
    packageNameToDirName(PACKAGE),
  );
}
