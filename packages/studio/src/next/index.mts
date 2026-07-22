import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ProjectJson } from "@liqvid/schemas";
import { RelativeDir } from "effect-paths";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { createElement } from "react";

import { NEXT_APP_DIR, PROJECT_FILE } from "../conventions.mts";
import { getServerState } from "../initialize.mts";

import { HelperComponent } from "./react.tsx";

/** Omit page from production bundle by returning a 404 */
export function omitFromProduction() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
}

export function liqvidProject<P>(
  importMetaUrl: string,
  Component: (
    props: P & {
      /** Project path. This is mainly used by development tools, and is automatically removed in the production build. */
      projectPath: RelativeDir;
    },
  ) => React.ReactNode,
) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = path.dirname(__filename);

  // development
  if (process.env.NODE_ENV === "development") {
    const { cwd } = getServerState();
    const projectPath = path.relative(path.join(cwd, NEXT_APP_DIR), __dirname);

    return function LiqvidProject(props: P) {
      return createElement(HelperComponent<P>, {
        Component,
        projectPath,
        props,
      });
    };
  }

  // production
  return async function Page(props: P) {
    const project = JSON.parse(
      await fsp.readFile(path.join(__dirname, PROJECT_FILE), "utf8"),
    ) as ProjectJson;

    if (project.draft) {
      return notFound();
    }

    return Component({ projectPath: RelativeDir(""), ...props });
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
