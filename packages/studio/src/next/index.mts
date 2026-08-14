import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ProjectJson } from "@liqvid/schemas";
import type { RelativeDir } from "effect-paths";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { createElement } from "react";

import { ServerDirectoryHelper } from "../assets.mts";
import {
  ASSETS_DIR,
  PROJECT_FILE,
  PROJECT_FILES_AUTOGEN,
} from "../conventions.mts";
import type { Directory } from "../types/assets.mts";
import { getRoutesDir } from "../utils/misc.mts";
import { extractParameterNames } from "../utils/parameters.mts";

import { ProjectPathHelperComponent } from "./react.tsx";

/** Omit page from production bundle by returning a 404 */
export function omitFromProduction() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
}

export function liqvidProject<
  D extends Directory,
  P = Record<string, never>,
  SP = Record<string, never>,
>(
  importMetaUrl: string,
  Component: (props: {
    params: Promise<P>;

    searchParams: Promise<SP>;

    /** Project path; this is mainly used by development tools. */
    projectPath: RelativeDir;

    /** Files in the project. */
    projectFiles: ServerDirectoryHelper<D>;
  }) => React.ReactNode,
) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);

  const projectPath = path.relative(getRoutesDir(), __dirname);

  // Extract parameter names from the project path (e.g., [lang], [locale])
  const paramNames = extractParameterNames(projectPath);

  // development
  if (process.env.NODE_ENV === "development") {
    return async function LiqvidProject(props: {
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

      const searchParams = await props.searchParams;
      const params = await props.params;

      // Extract project parameter values from Next.js params
      const projectParams: Record<string, string> = {};
      for (const paramName of paramNames) {
        const value = (params as Record<string, unknown>)[paramName];
        if (typeof value === "string") {
          projectParams[paramName] = value;
        }
      }

      const children = createElement(Component, {
        projectFiles: new ServerDirectoryHelper(projectFiles),
        projectPath,
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
  return async function LiqvidProject(props: {
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

    return Component({
      projectFiles: new ServerDirectoryHelper(projectFiles),
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

function cartesianProduct<T extends Record<string, readonly string[]>>(
  parameters: T,
): Array<{ [K in keyof T]: T[K][number] }> {
  const keys = Object.keys(parameters) as (keyof T)[];

  if (keys.length === 0) return [];

  return keys.reduce<Array<Record<string, string>>>(
    (acc, key) => {
      const values = parameters[key]!;
      return acc.flatMap((obj) =>
        values.map((value) => ({ ...obj, [key]: value })),
      );
    },
    [{}],
  ) as Array<{ [K in keyof T]: T[K][number] }>;
}
