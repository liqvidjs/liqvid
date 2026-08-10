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
      } catch (e) {
        console.error(e);
      }

      const searchParams = await props.searchParams;

      return createElement(ProjectPathHelperComponent, {
        children: createElement(Component, {
          projectFiles: new ServerDirectoryHelper(projectFiles),
          projectPath,
          ...props,
        }),
        isPreview: searchParams.preview !== undefined,
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
    } catch (e) {
      console.error(e);
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
