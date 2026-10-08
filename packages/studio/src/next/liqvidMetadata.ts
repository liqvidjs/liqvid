import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveParametrized } from "@liqvid/cli/utils";
import type { ProjectJson } from "@liqvid/schemas";
import type { Metadata, ResolvingMetadata } from "next";

import { PROJECT_FILE } from "#_/conventions";
import { cartesianProduct } from "#_/utils/misc";

export function liqvidGenerateProjectMetadata(importMetaUrl: string) {
  return async function generateMetadata(
    props: { params: Promise<Record<string, string>> },
    _parent: ResolvingMetadata,
  ): Promise<Metadata> {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = path.dirname(__filename);

    const project = JSON.parse(
      await fsp.readFile(path.join(__dirname, PROJECT_FILE), "utf8"),
    ) as ProjectJson;

    const params = await props.params;

    const title = resolveParametrized(project.title, params);

    const description = project.description
      ? resolveParametrized(project.description, params)
      : undefined;

    return {
      description,
      title,
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
