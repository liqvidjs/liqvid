"use server";

import path from "node:path";

import type { ParameterConfig, ParameterValues } from "@liqvid/schemas";
import {
  ASSETS_DIR,
  getRoutesDir,
  getWorkspaceProjects,
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

export async function listWorkspaceProjects() {
  return getWorkspaceProjects();
}

export async function saveSnapshot(
  projectPath: RelativeDir,
  params: ParameterValues,
  snapshot: TLEditorSnapshot,
  index: number,
): Promise<SavedState> {
  const pluginDir = getPluginDir(projectPath, params);

  const createdAt = new Date().toISOString();

  return await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      let captureIndex = index + 1;
      let name = `capture${captureIndex}`;
      while (
        yield* fs.exists(path.join(pluginDir, RelativeFile(`${name}.json`)))
      ) {
        name = `capture${++captureIndex}`;
      }
      const newSaved = {
        createdAt,
        isGlobal: false,
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
  isGlobal = false,
): Promise<SavedState> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);

  const pluginDir = getSavedStateDir(projectPath, params, isGlobal);
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
        isGlobal,
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
  isGlobal = false,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);
  validateName(newName, t.errors.invalidName);

  const pluginDir = getSavedStateDir(projectPath, params, isGlobal);

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
  isGlobal = false,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);

  await serverRuntime.runPromise(
    Effect.gen(function* () {
      yield* deleteTypedJson({
        dirname: getSavedStateDir(projectPath, params, isGlobal),
        filename: RelativeFile(`${name}.json`),
      });
    }),
  );
}

export async function copySnapshotToProject(
  sourceProjectPath: RelativeDir,
  sourceParams: ParameterValues,
  targetProjectPath: RelativeDir,
  targetParams: ParameterValues,
  name: string,
  sourceIsGlobal = false,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);

  const { projects, rootParameters } = await getWorkspaceProjects();
  const targetProject = projects.find(
    ({ path: projectPath }) => projectPath === targetProjectPath,
  );

  if (!targetProject) {
    throw new Error("Project not found in this workspace");
  }

  const sourceProject = projects.find(({ path }) => path === sourceProjectPath);
  if (!sourceIsGlobal && !sourceProject) {
    throw new Error("Project not found in this workspace");
  }
  const sourceDirectory = sourceIsGlobal
    ? getGlobalPluginDir()
    : getPluginDir(
        sourceProjectPath,
        validateParams(sourceParams, sourceProjectPath, {
          ...rootParameters,
          ...sourceProject?.parameters,
        }),
      );
  const targetDirectory = getPluginDir(
    targetProjectPath,
    validateParams(targetParams, targetProjectPath, {
      ...rootParameters,
      ...targetProject.parameters,
    }),
  );
  const filename = RelativeFile(`${name}.json`);

  await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const sourceFile = path.join(sourceDirectory, filename);
      const targetFile = path.join(targetDirectory, filename);

      if (!(yield* fs.exists(sourceFile))) {
        throw new Error(t.errors.notFound.replaceAll("{name}", name));
      }
      if (yield* fs.exists(targetFile)) {
        throw new Error(t.errors.nameExists.replaceAll("{name}", name));
      }

      const { snapshot } = JSON.parse(
        yield* fs.readFileString(sourceFile),
      ) as Omit<SavedState, "name" | "isGlobal">;
      const createdAt = new Date().toISOString();

      yield* writeTypedJson({
        data: { createdAt, snapshot },
        declaration: snapshotDeclaration,
        dirname: targetDirectory,
        filename,
      });
    }),
  );
}

export async function listSaved(
  projectPath: RelativeDir,
  params: ParameterValues,
): Promise<readonly SavedState[]> {
  const pluginDir = getPluginDir(projectPath, params);
  const globalDir = getGlobalPluginDir();

  const exit = await serverRuntime.runPromiseExit(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      yield* Effect.all([
        fs.makeDirectory(pluginDir, { recursive: true }),
        fs.makeDirectory(globalDir, { recursive: true }),
      ]);
      const [projectSaved, globalSaved] = yield* Effect.all([
        readSavedDirectory(pluginDir, false),
        readSavedDirectory(globalDir, true),
      ]);
      return [...projectSaved, ...globalSaved];
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

export async function makeSnapshotGlobal(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);
  const sourceDir = getPluginDir(projectPath, params);
  const targetDir = getGlobalPluginDir();
  const filename = RelativeFile(`${name}.json`);

  await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(targetDir, { recursive: true });
      if (!(yield* fs.exists(path.join(sourceDir, filename)))) {
        throw new Error(t.errors.notFound.replaceAll("{name}", name));
      }
      if (yield* fs.exists(path.join(targetDir, filename))) {
        throw new Error(t.errors.nameExists.replaceAll("{name}", name));
      }
      yield* renameTypedJson(
        { dirname: sourceDir, filename },
        { dirname: targetDir, filename },
      );
    }),
  );
}

const readSavedDirectory = Effect.fnUntraced(function* (
  pluginDir: ReturnType<typeof getPluginDir>,
  isGlobal: boolean,
) {
  const fs = yield* FileSystem.FileSystem;
  const files = yield* readDirWithFileTypes(pluginDir);
  return yield* Effect.all(
    files.reduce(
      (acc, [filename, kind]) => {
        if (kind === "File" && filename.endsWith(".json")) {
          acc.push(
            Effect.gen(function* () {
              const contents = JSON.parse(
                yield* fs.readFileString(path.join(pluginDir, filename)),
              ) as Omit<SavedState, "name" | "isGlobal">;
              return {
                ...contents,
                isGlobal,
                name: filename.slice(0, -".json".length),
              };
            }),
          );
        }
        return acc;
      },
      [] as Effect.Effect<SavedState, PlatformError.PlatformError>[],
    ),
    { concurrency: 10 },
  );
});

function validateName(name: string, errorMessageWhenInvalid: string): void {
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) {
    throw new Error(errorMessageWhenInvalid);
  }
}

function validateParams(
  params: ParameterValues,
  projectPath: RelativeDir,
  definitions: ParameterConfig,
): ParameterValues {
  const validated: Record<string, string> = {};

  const parameterNames = Array.from(
    projectPath.matchAll(/\[([^\]]+)\]/g),
    ([, name]) => name!,
  );
  for (const key of parameterNames) {
    const values = definitions[key];
    const value = params[key];
    if (!values?.includes(value ?? "")) {
      throw new Error(`Invalid value for project parameter "${key}"`);
    }
    validated[key] = value!;
  }

  return validated;
}

function getPluginDir(projectPath: RelativeDir, params: ParameterValues) {
  return path.join(
    resolveProjectPath(projectPath),
    ASSETS_DIR,
    ...(Object.values(params) as RelativeDir[]),
    packageNameToDirName(PACKAGE),
  );
}

function getGlobalPluginDir() {
  return path.join(getRoutesDir(), ASSETS_DIR, packageNameToDirName(PACKAGE));
}

function getSavedStateDir(
  projectPath: RelativeDir,
  params: ParameterValues,
  isGlobal: boolean,
) {
  return isGlobal ? getGlobalPluginDir() : getPluginDir(projectPath, params);
}
