/**
 * @file This needs to be isolated from the metadata generation functions, since
 * those don't work with client content even assuming "use client".
 */
import type fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { agnosticFileSystem, resolveParametrized } from "@liqvid/cli/utils";
import {
  type AutoGenProjectMeta,
  ProjectJson,
  type RecordingMetaFile,
} from "@liqvid/schemas";
import { Effect, Exit, Layer, Logger } from "effect";
import { type AbsoluteDir, RelativeDir, type RelativePath } from "effect-paths";
import { notFound } from "next/navigation";

import type { Directory } from "#_/assets";
import {
  ASSETS_DIR,
  PROJECT_FILE,
  PROJECT_FILES_AUTOGEN,
  PROJECT_META_FILE,
  RECORDING_META_FILE,
  RECORDINGS_DIR,
} from "#_/conventions";
import { getRoutesDir, loadJson } from "#_/server";
import { withLogLevel } from "#_/server-runtime";
import {
  type ChosenRecordingData,
  type ChosenRecordingsData,
  createRecordingTree,
  nestRecordingLeaves,
} from "#_/utils/chosen-recordings";
import { extractParameterNames } from "#_/utils/parameters";

import { MysteriouslyFixCreateContextErrorsDuringBuild } from "./liqvidProject.client.tsx";

export function liqvidProject<
  D extends Directory,
  P extends Record<string, unknown>,
  R = Record<string, never>,
  SP = Record<string, never>,
>(
  importMetaUrl: string,
  Component: (props: {
    params: P;

    searchParams: Promise<SP>;

    project: ProjectJson;

    /** Project path; this is mainly used by development tools. */
    projectPath: RelativeDir;

    /** Files in the project. */
    projectFiles: D;

    /**
     * The recordings chosen for inclusion in the final video. Only the
     * current parameter combination is populated at runtime; type this with
     * the generated `ChosenRecordings` type from `.liqvid/types.ts`.
     *
     * Note: these are class instances and cannot be passed to client
     * components — use `useRecordings` on the client instead.
     */
    recordings: R;
  }) => React.ReactNode,
) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);

  const projectPath = path.relative(getRoutesDir(), __dirname);

  // Extract parameter names from the project path (e.g., [lang], [locale])
  const paramNames = extractParameterNames(projectPath);

  // development
  if (import.meta.env.DEV) {
    return async function LiqvidProject({
      params: $params,
      searchParams: $searchParams,
      ...props
    }: {
      params: Promise<P>;
      searchParams: Promise<SP & { preview?: string | string[] | undefined }>;
    }) {
      const [
        { IsPreviewProvider, ProjectParamsProvider, ProjectPathProvider },
        { RecordingsProvider },
      ] = await Promise.all([
        import("@liqvid/studio-plugin-api"),
        import("#_/contexts/recordings"),
      ]);

      let projectFiles = {} as D;

      try {
        projectFiles = JSON.parse(
          await fsp.readFile(
            path.join(__dirname, ASSETS_DIR, PROJECT_FILES_AUTOGEN),
            "utf8",
          ),
        );
      } catch (_) {
        // console.error(e);
      }

      const [params, searchParams] = await Promise.all([
        $params,
        $searchParams,
      ]);

      // Load project.json to get declared parameters
      let declaredParameters: Record<string, readonly string[]> | undefined;

      const $project = await Effect.runPromiseExit(
        withLogLevel(
          loadJson(ProjectJson, path.join(__dirname, PROJECT_FILE)),
        ).pipe(
          Effect.tapCauseIf(
            (cause) =>
              cause.reasons.some(
                (reason) =>
                  reason._tag === "Fail" &&
                  reason.error._tag === "FileDecodeError",
              ),
            (cause) =>
              Effect.logError(
                `[page render] Failed to load project.json for ${projectPath}:`,
                cause,
              ),
          ),
          Effect.provide(
            Layer.mergeAll(
              Logger.layer([Logger.consolePretty()]),
              agnosticFileSystem,
            ),
          ),
        ),
      );

      if (!Exit.isSuccess($project)) {
        return notFound();
      }

      const project = $project.value;

      declaredParameters = project.parameters;

      // Extract and validate project parameter values from Next.js params
      const projectParams: Record<string, string> = {};
      for (const paramName of paramNames) {
        const value = (params as Record<string, unknown>)[paramName];
        if (typeof value === "string") {
          // Validate that the value is in the declared set of allowed values
          const allowedValues = declaredParameters?.[paramName];
          if (allowedValues && !allowedValues.includes(value)) {
            return notFound();
          }
          projectParams[paramName] = value;
        }
      }

      const recordingData = await createProjectRecordingData<R>(
        __dirname as AbsoluteDir,
        projectPath,
        paramNames,
        projectParams,
        `/api/liqvid/static/${projectPath}/${ASSETS_DIR}`,
      );

      const isPreview = searchParams.preview !== undefined;

      return (
        <IsPreviewProvider value={isPreview}>
          {isPreview && (
            <style>{`[data-nextjs-dev-overlay="true"] {display: none !important;}`}</style>
          )}
          <ProjectPathProvider value={projectPath}>
            <ProjectParamsProvider
              value={paramNames.length > 0 ? projectParams : null}
            >
              <RecordingsProvider
                value={{
                  base: recordingData.base,
                  parameterDepth: recordingData.parameterDepth,
                  recordings: recordingData.recordingsData,
                }}
              >
                <Component
                  {...{
                    params,
                    project,
                    projectFiles,
                    projectPath,
                    recordings: recordingData.recordings,
                    searchParams: $searchParams,
                    ...props,
                  }}
                />
              </RecordingsProvider>
            </ProjectParamsProvider>
          </ProjectPathProvider>
        </IsPreviewProvider>
      );
    };
  }

  // production
  return async function LiqvidProject({
    params: $params,
    ...props
  }: {
    params: Promise<P>;
    searchParams: Promise<SP & { preview?: string | string[] | undefined }>;
  }) {
    let projectFiles = {} as D;

    try {
      projectFiles = JSON.parse(
        await fsp.readFile(
          path.join(__dirname, ASSETS_DIR, PROJECT_FILES_AUTOGEN),
          "utf8",
        ),
      );
    } catch (_) {
      // console.error(e);
    }

    const $project = await Effect.runPromiseExit(
      loadJson(ProjectJson, path.join(__dirname, PROJECT_FILE)).pipe(
        Effect.provide(agnosticFileSystem),
      ),
    );

    if (!Exit.isSuccess($project)) {
      console.error(
        `[page render] Failed to load project.json for ${projectPath}:`,
        $project.cause,
      );
      return notFound();
    }

    const project = $project.value;

    // Validate parameter values against declared allowed values
    const params = await $params;

    const projectParams: Record<string, string> = {};
    const declaredParameters = project.parameters;
    for (const paramName of paramNames) {
      const value = (params as Record<string, unknown>)[paramName];
      if (typeof value === "string") {
        const allowedValues = declaredParameters?.[paramName];
        if (allowedValues && !allowedValues.includes(value)) {
          return notFound();
        }

        projectParams[paramName] = value;
      }
    }

    if (resolveParametrized(project.draft, params as Record<string, string>)) {
      return notFound();
    }

    const recordingData = await createProjectRecordingData<R>(
      __dirname as AbsoluteDir,
      projectPath,
      paramNames,
      params as Record<string, string>,
      new URL(
        `${projectPath}/${ASSETS_DIR}`,
        process.env.NEXT_PUBLIC_MEDIA_BASE,
      ).toString(),
    );

    return (
      <MysteriouslyFixCreateContextErrorsDuringBuild
        projectParams={projectParams ?? null}
        projectPath={projectPath}
        recordingData={{
          base: recordingData.base,
          parameterDepth: recordingData.parameterDepth,
          recordings: recordingData.recordingsData,
        }}
      >
        <Component
          {...{
            params,
            project,
            projectFiles,
            projectPath,
            recordings: recordingData.recordings,
            ...props,
          }}
        />
      </MysteriouslyFixCreateContextErrorsDuringBuild>
    );
  };
}

async function createProjectRecordingData<R>(
  projectDir: AbsoluteDir,
  _projectPath: RelativeDir,
  paramNames: readonly string[],
  params: Readonly<Record<string, string>>,
  base: string,
): Promise<{
  base: string;
  recordingsData: ChosenRecordingsData;
  parameterDepth: number;
  recordings: R;
}> {
  const parameterValues = paramNames.map((name) => params[name] ?? "");
  const assetsDir = path.join(
    projectDir,
    ASSETS_DIR,
    ...(parameterValues as RelativeDir[]),
  );
  const chosen = await createChosenRecordings<R>(
    assetsDir,
    base,
    parameterValues,
  );

  return { ...chosen, base, parameterDepth: paramNames.length };
}

async function createChosenRecordings<R>(
  assetsDir: AbsoluteDir,
  base: string,
  parameterValues: readonly string[],
): Promise<{ recordingsData: ChosenRecordingsData; recordings: R }> {
  const chosenRecordings = await loadChosenRecordingsData(assetsDir);
  const recordingsData = nestRecordingLeaves(
    parameterValues,
    chosenRecordings,
  ) as ChosenRecordingsData;

  return {
    recordings: createRecordingTree(
      base,
      recordingsData,
      parameterValues.length,
    ) as R,
    recordingsData,
  };
}

/**
 * Load recording-shaped data from the `recordings` directory and each chosen
 * recording's `recording-meta.json` duration. Every recording is chosen
 * unless listed in the `hiddenRecordings` field of `project-meta.json`.
 */
async function loadChosenRecordingsData(
  assetsDir: AbsoluteDir,
): Promise<Record<string, ChosenRecordingData>> {
  let hiddenRecordings: Record<string, boolean> = {};

  try {
    const meta = JSON.parse(
      await fsp.readFile(path.join(assetsDir, PROJECT_META_FILE), "utf8"),
    ) as AutoGenProjectMeta;
    hiddenRecordings = meta.hiddenRecordings ?? {};
  } catch {
    // no metadata; recordings are still chosen by default
  }

  const recordings: Record<string, ChosenRecordingData> = {};

  let dirents: fs.Dirent<RelativePath>[];
  try {
    dirents = await fsp.readdir(path.join(assetsDir, RECORDINGS_DIR), {
      withFileTypes: true,
    });
  } catch {
    return {};
  }

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;

    // guard against malformed directory names
    const name = dirent.name;
    if (name.includes("/") || name.includes("..")) continue;

    // hidden recordings are excluded; missing entries default to chosen
    if (hiddenRecordings[name] === true) continue;

    try {
      const recordingMeta = JSON.parse(
        await fsp.readFile(
          path.join(
            assetsDir,
            RECORDINGS_DIR,
            RelativeDir(name),
            RECORDING_META_FILE,
          ),
          "utf8",
        ),
      ) as RecordingMetaFile;

      recordings[name] = { duration: recordingMeta.duration };
    } catch {
      // recording is missing or invalid; skip it
    }
  }

  return recordings;
}
