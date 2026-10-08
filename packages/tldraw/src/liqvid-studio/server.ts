"use server";

import path from "node:path";

import type { ParameterValues } from "@liqvid/schemas";
import {
  ASSETS_DIR,
  type Localized,
  readDirWithFileTypes,
  getTranslations as readTranslations,
  resolveProjectPath,
  serverRuntime,
} from "@liqvid/studio/server";
import { packageNameToDirName } from "@liqvid/studio-plugin-api";
import {
  deleteTypedJson,
  inlineTypeDeclaration,
  renameTypedJson,
  writeTypedJson,
} from "@liqvid/studio-plugin-api/server";
import type { TLEditorSnapshot } from "@tldraw/editor";
import { Cause, Effect, Exit, FileSystem, type PlatformError } from "effect";
import { type RelativeDir, RelativeFile } from "effect-paths";

import { PACKAGE } from "../version.ts";

import type { SavedState } from "./types.ts";

import type Translations from "./.translations/en.json";

type T = Localized<typeof Translations>;

const snapshotDeclaration = inlineTypeDeclaration(`{
  createdAt: string;
  name: string;
  snapshot: import("@tldraw/editor").TLEditorSnapshot;
}`);

/**
 * Load this plugin's UI strings for the studio locale.
 *
 * `useAsyncTranslations` resolves files under the studio package root, so a
 * plugin loads its own `.translations` directory from a server action.
 */
export async function getTranslations(): Promise<T> {
  return readTranslations<typeof Translations>(import.meta.url);
}

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
        declaration: snapshotDeclaration,
        dirname: pluginDir,
        filename: RelativeFile(`${name}.json`),
      });

      return newSaved;
    }),
  );
}

export async function overwriteSnapshot(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
  snapshot: TLEditorSnapshot,
): Promise<SavedState> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);

  const pluginDir = getPluginDir(projectPath, params);
  const createdAt = new Date().toISOString();
  const filename = RelativeFile(`${name}.json`);

  return await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      if (!(yield* fs.exists(path.join(pluginDir, filename)))) {
        throw new Error(t.errors.notFound.replaceAll("{name}", name));
      }

      yield* writeTypedJson({
        data: {
          createdAt,
          snapshot,
        },
        declaration: snapshotDeclaration,
        dirname: pluginDir,
        filename,
      });

      return {
        createdAt,
        name,
        snapshot,
      };
    }),
  );
}

export async function renameSnapshot(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
  newName: string,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);
  validateName(newName, t.errors.invalidName);

  const pluginDir = getPluginDir(projectPath, params);

  await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      if (
        yield* fs.exists(path.join(pluginDir, RelativeFile(`${newName}.json`)))
      ) {
        throw new Error(t.errors.nameExists.replaceAll("{name}", newName));
      }

      yield* renameTypedJson(
        {
          dirname: pluginDir,
          filename: RelativeFile(`${name}.json`),
        },
        {
          dirname: pluginDir,
          filename: RelativeFile(`${newName}.json`),
        },
      );
    }),
  );
}

export async function deleteSnapshot(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);

  await serverRuntime.runPromise(
    Effect.gen(function* () {
      yield* deleteTypedJson({
        dirname: getPluginDir(projectPath, params),
        filename: RelativeFile(`${name}.json`),
      });
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

function validateName(name: string, errorMessageWhenInvalid: string): void {
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) {
    throw new Error(errorMessageWhenInvalid);
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
