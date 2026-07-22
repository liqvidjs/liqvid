import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadJson } from "@liqvid/cli/utils";
import type { ProjectJson } from "@liqvid/schemas";
import { Effect } from "effect";
import { RelativeDir } from "effect-paths";
import type { Metadata, ResolvingMetadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { NEXT_APP_DIR, PROJECT_FILE } from "../conventions.mts";
import { getServerState } from "../initialize.mts";

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
      /**
       * Project path. This must be passed to `<LiqvidDevToolsProvider>`.
       * It is automatically removed in the production build.
       */
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

    return (props: P) => Component({ projectPath, ...props });
  }

  // production
  return async (props: P) => {
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
