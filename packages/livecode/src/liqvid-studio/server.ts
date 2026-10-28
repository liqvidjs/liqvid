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
import { Cause, Effect, Exit, FileSystem, type PlatformError } from "effect";
import { type RelativeDir, RelativeFile } from "effect-paths";

import { PACKAGE } from "../version.ts";

import type { SavedState } from "./types.ts";

import type Translations from "./.translations/en.json";

type T = Localized<typeof Translations>;

const stateDeclaration = inlineTypeDeclaration(`{
  createdAt: string;
  files: Record<string, string>;
}`);

export async function getTranslations(): Promise<T> {
  return readTranslations<typeof Translations>(import.meta.url);
}

export async function listWorkspaceProjects() {
  return getWorkspaceProjects();
}

export async function saveState(
  projectPath: RelativeDir,
  params: ParameterValues,
  files: Readonly<Record<string, string>>,
  index: number,
): Promise<SavedState> {
  const createdAt = new Date().toISOString();
  const directory = getProjectPluginDir(projectPath, params);
  return serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      let captureIndex = index + 1;
      let name = `capture${captureIndex}`;
      while (
        yield* fs.exists(path.join(directory, RelativeFile(`${name}.json`)))
      ) {
        name = `capture${++captureIndex}`;
      }
      yield* writeTypedJson({
        data: { createdAt, files },
        declaration: stateDeclaration,
        dirname: directory,
        filename: RelativeFile(`${name}.json`),
      });
      return { createdAt, files, isGlobal: false, name };
    }),
  );
}

export async function overwriteState(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
  files: Readonly<Record<string, string>>,
  isGlobal = false,
): Promise<SavedState> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);
  const directory = getSavedStateDir(projectPath, params, isGlobal);
  const createdAt = new Date().toISOString();
  const filename = RelativeFile(`${name}.json`);
  await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      if (!(yield* fs.exists(path.join(directory, filename)))) {
        throw new Error(t.errors.notFound.replaceAll("{name}", name));
      }
      yield* writeTypedJson({
        data: { createdAt, files },
        declaration: stateDeclaration,
        dirname: directory,
        filename,
      });
    }),
  );
  return { createdAt, files, isGlobal, name };
}

export async function renameState(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
  newName: string,
  isGlobal = false,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);
  validateName(newName, t.errors.invalidName);
  const directory = getSavedStateDir(projectPath, params, isGlobal);
  await serverRuntime.runPromise(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      if (
        yield* fs.exists(path.join(directory, RelativeFile(`${newName}.json`)))
      ) {
        throw new Error(t.errors.nameExists.replaceAll("{name}", newName));
      }
      yield* renameTypedJson(
        { dirname: directory, filename: RelativeFile(`${name}.json`) },
        { dirname: directory, filename: RelativeFile(`${newName}.json`) },
      );
    }),
  );
}

export async function deleteState(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
  isGlobal = false,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);
  await serverRuntime.runPromise(
    deleteTypedJson({
      dirname: getSavedStateDir(projectPath, params, isGlobal),
      filename: RelativeFile(`${name}.json`),
    }),
  );
}

export async function makeStateGlobal(
  projectPath: RelativeDir,
  params: ParameterValues,
  name: string,
): Promise<void> {
  const t = await getTranslations();
  validateName(name, t.errors.invalidName);
  const sourceDir = getProjectPluginDir(projectPath, params);
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

export async function copyStateToProject(
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
  const sourceProject = projects.find(
    ({ path: projectPath }) => projectPath === sourceProjectPath,
  );
  const targetProject = projects.find(
    ({ path: projectPath }) => projectPath === targetProjectPath,
  );
  if (!targetProject || (!sourceIsGlobal && !sourceProject)) {
    throw new Error("Project not found in this workspace");
  }
  const sourceDirectory = sourceIsGlobal
    ? getGlobalPluginDir()
    : getProjectPluginDir(
        sourceProjectPath,
        validateParams(sourceParams, sourceProjectPath, {
          ...rootParameters,
          ...sourceProject?.parameters,
        }),
      );
  const targetDirectory = getProjectPluginDir(
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
      const contents = JSON.parse(yield* fs.readFileString(sourceFile)) as Omit<
        SavedState,
        "name" | "isGlobal"
      >;
      yield* writeTypedJson({
        data: { createdAt: new Date().toISOString(), files: contents.files },
        declaration: stateDeclaration,
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
  const projectDir = getProjectPluginDir(projectPath, params);
  const globalDir = getGlobalPluginDir();
  const exit = await serverRuntime.runPromiseExit(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* Effect.all([
        fs.makeDirectory(projectDir, { recursive: true }),
        fs.makeDirectory(globalDir, { recursive: true }),
      ]);
      const [projectSaved, globalSaved] = yield* Effect.all([
        readSavedDirectory(projectDir, false),
        readSavedDirectory(globalDir, true),
      ]);
      return [...projectSaved, ...globalSaved];
    }).pipe(
      Effect.tapCause((cause) =>
        Effect.logError(
          `Failed to list saved code states`,
          Cause.pretty(cause),
        ),
      ),
    ),
  );
  if (Exit.isFailure(exit)) {
    throw exit.cause;
  }
  return exit.value;
}

const readSavedDirectory = Effect.fnUntraced(function* (
  directory: ReturnType<typeof getProjectPluginDir>,
  isGlobal: boolean,
) {
  const fs = yield* FileSystem.FileSystem;
  const files = yield* readDirWithFileTypes(directory);
  return yield* Effect.all(
    files.reduce(
      (actions, [filename, kind]) => {
        if (kind === "File" && filename.endsWith(".json")) {
          actions.push(
            Effect.gen(function* () {
              const contents = JSON.parse(
                yield* fs.readFileString(path.join(directory, filename)),
              ) as Omit<SavedState, "name" | "isGlobal">;
              return { ...contents, isGlobal, name: filename.slice(0, -5) };
            }),
          );
        }
        return actions;
      },
      [] as Effect.Effect<SavedState, PlatformError.PlatformError>[],
    ),
    { concurrency: 10 },
  );
});

function validateName(name: string, errorMessage: string): void {
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) {
    throw new Error(errorMessage);
  }
}

function validateParams(
  params: ParameterValues,
  projectPath: RelativeDir,
  definitions: ParameterConfig,
): ParameterValues {
  const validated: Record<string, string> = {};
  for (const [, name] of projectPath.matchAll(/\[([^\]]+)\]/g)) {
    const values = definitions[name!];
    const value = params[name!];
    if (!values?.includes(value ?? "")) {
      throw new Error(`Invalid value for project parameter "${name}"`);
    }
    validated[name!] = value!;
  }
  return validated;
}

function getProjectPluginDir(
  projectPath: RelativeDir,
  params: ParameterValues,
) {
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
  return isGlobal
    ? getGlobalPluginDir()
    : getProjectPluginDir(projectPath, params);
}
