import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { agnosticFileSystem, loadJson } from "@liqvid/cli/utils";
import { ProjectJson } from "@liqvid/schemas";
import { Effect, Exit, type Record } from "effect";
import type { RelativeDir } from "effect-paths";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { createElement } from "react";

import {
  ASSETS_DIR,
  PROJECT_FILE,
  PROJECT_FILES_AUTOGEN,
} from "#_/conventions.mjs";
import type { Directory } from "#_/types/assets.mjs";
import { cartesianProduct, getRoutesDir } from "#_/utils/misc.mjs";
import { extractParameterNames } from "#_/utils/parameters.mjs";

import { ProjectPathHelperComponent } from "./react.tsx";

export function liqvidProject<
  D extends Directory,
  P extends Record<string, unknown>,
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
  }) => React.ReactNode,
) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);

  const projectPath = path.relative(getRoutesDir(), __dirname);

  // Extract parameter names from the project path (e.g., [lang], [locale])
  const paramNames = extractParameterNames(projectPath);

  // development
  if (process.env.NODE_ENV === "development") {
    return async function LiqvidProject({
      params: $params,
      searchParams: $searchParams,
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

      const [params, searchParams] = await Promise.all([
        $params,
        $searchParams,
      ]);

      // Load project.json to get declared parameters
      let declaredParameters: Record<string, readonly string[]> | undefined;

      const $project = await Effect.runPromiseExit(
        loadJson(ProjectJson, path.join(__dirname, PROJECT_FILE)).pipe(
          Effect.provide((await agnosticFileSystem()).layer),
        ),
      );

      if (!Exit.isSuccess($project)) {
        console.error("Failed to load project.json:", $project.cause);
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

      const children = createElement(Component, {
        params,
        project,
        projectFiles,
        projectPath,
        searchParams: $searchParams,
        ...props,
      });

      return createElement(ProjectPathHelperComponent, {
        children: children,
        isPreview: searchParams.preview !== undefined,
        projectParams: paramNames.length > 0 ? projectParams : undefined,
        projectPath,
      });
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

    const project = JSON.parse(
      await fsp.readFile(path.join(__dirname, PROJECT_FILE), "utf8"),
    ) as ProjectJson;

    if (project.draft) {
      return notFound();
    }

    // Validate parameter values against declared allowed values
    const params = await $params;

    const declaredParameters = project.parameters;
    for (const paramName of paramNames) {
      const value = (params as Record<string, unknown>)[paramName];
      if (typeof value === "string") {
        const allowedValues = declaredParameters?.[paramName];
        if (allowedValues && !allowedValues.includes(value)) {
          return notFound();
        }
      }
    }

    return Component({
      params,
      project,
      projectFiles,
      projectPath,
      ...props,
    });
  };
}

export function liqvidGenerateProjectMetadata(importMetaUrl: string) {
  return async function generateMetadata(
    _props: unknown,
    _parent: ResolvingMetadata,
  ): Promise<Metadata> {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = path.dirname(__filename);

    const project = JSON.parse(
      await fsp.readFile(path.join(__dirname, PROJECT_FILE), "utf8"),
    ) as ProjectJson;

    return {
      description: project.description,
      title: project.name,
    };
  };
}

export function liqvidGenerateProjectStaticParams(importMetaUrl: string) {
  return async function generateStaticParams(): Promise<
    Record<string, string>[]
  > {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = path.dirname(__filename);

    const project = JSON.parse(
      await fsp.readFile(path.join(__dirname, PROJECT_FILE), "utf8"),
    ) as ProjectJson;

    return cartesianProduct(project.parameters ?? {});
  };
}
