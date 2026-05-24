import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { Duration } from "@liqvid/duration";
import type { Maybe } from "@liqvid/fp";
import {
  type AspectRatio,
  AutoGenProjectMeta,
  ProjectJson,
  type ProjectMeta,
} from "@liqvid/schemas";
import { ZodError } from "zod";

import { PROJECT_FILE, PROJECT_META_FILE } from "../conventions.mts";
import { getBiomePath, loadJson, walkDir } from "../utils/fs.mts";

import { ASSETS_DIRNAME } from "./watch-assets.mts";

type Projects = Record<string, ProjectMeta>;

interface Context {
  basename: string;
  dirname: string;
  filename: string;
  projects: Projects;
}

const TARGET_DIR = path.join(process.cwd(), "app");

export async function watchProjectFiles(projects: Projects) {
  // initial check
  await walkDir(
    TARGET_DIR,
    async ({ basename, dirname, filename }) => {
      // initialize project metadata
      if (basename === "project.json") {
        await createProject({ basename, dirname, filename, projects });
      }
    },
    ({ basename }) => {
      if (basename === ".liqvid") return false;
      return true;
    },
  );

  // set up watch
  fs.watch(TARGET_DIR, { recursive: true }, async (_eventName, relPath) => {
    if (!relPath) return;

    const filename = path.join(TARGET_DIR, relPath);
    const basename = path.basename(filename);
    const dirname = path.dirname(filename);

    switch (basename) {
      case PROJECT_FILE: {
        await handleProjectJson({
          basename,
          dirname,
          filename,
          projects,
        });
        break;
      }
      case PROJECT_META_FILE: {
        await handleProjectMeta({
          basename,
          dirname,
          filename,
          projects,
        });
        break;
      }
    }

    // values
  });
}

/**
 * Handle new or deleted project.json files
 */
async function handleProjectJson({ dirname, filename, projects }: Context) {
  const entryFile = path.join(dirname, "page.tsx");

  if (!fs.existsSync(entryFile)) {
    return;
  }

  const biomePath = await getBiomePath(dirname);

  // read project file
  const $project = await loadJson(ProjectJson, filename);
  if ($project.isErr) {
    const error = $project.unwrapErr();
    if (error instanceof SyntaxError) {
      console.error(`JSON error in ${filename}`, error);
    } else {
      console.error(`invalid ProjectJson format in ${filename}`, error);
    }
    return;
  }
  const project = $project.unwrap();

  const meta: ProjectMeta = {
    ...project,
    aspectRatio: parseAspectRatio(project.aspectRatio),
    duration: new Duration({ milliseconds: 1000 }),
    openGraph: hasOpenGraphImage(dirname),
    path: path.relative(TARGET_DIR, dirname),
    twitter: hasTwitterImage(dirname),
  };

  projects[meta.path] = meta;

  await generateProjectDir({ biomePath, dirname });
}

/**
 * Handle new or deleted project.json files
 */
async function createProject({ dirname, filename, projects }: Context) {
  const entryFile = path.join(dirname, "page.tsx");

  if (!fs.existsSync(entryFile)) {
    return;
  }

  const biomePath = await getBiomePath(dirname);

  // read project file
  const $project = await loadJson(ProjectJson, filename);
  if ($project.isErr) {
    const error = $project.unwrapErr();
    if (error instanceof SyntaxError) {
      console.error(`JSON error in ${filename}`, error);
    } else {
      console.error(`invalid ProjectJson format in ${filename}`, error);
    }
    return;
  }
  const project = $project.unwrap();

  // read duration
  const $autoGenMeta = await loadJson(
    AutoGenProjectMeta,
    path.join(dirname, ".liqvid", PROJECT_META_FILE),
  );

  if ($autoGenMeta.isErr) {
    const error = $autoGenMeta.unwrapErr();
    if (error instanceof SyntaxError) {
      console.error(`JSON error in ${filename}`, error);
      return;
    } else if (error instanceof ZodError) {
      console.error(`invalid AutoGenProjectMeta format in ${filename}`, error);
      return;
    }
  }
  const duration = $autoGenMeta.match({
    Err: () => new Duration({ minutes: 1 }),
    Ok: ({ duration }) => new Duration(duration),
  });

  const meta: ProjectMeta = {
    ...project,
    aspectRatio: parseAspectRatio(project.aspectRatio),
    duration,
    openGraph: hasOpenGraphImage(dirname),
    path: path.relative(TARGET_DIR, dirname),
    twitter: hasTwitterImage(dirname),
  };

  projects[meta.path] = meta;

  await generateProjectDir({ biomePath, dirname });
}

/**
 * Handle auto-generated project-meta.json files
 */
async function handleProjectMeta({
  dirname: dotLiqvidDir,
  filename,
  projects,
}: Context) {
  const projectPath = path.relative(TARGET_DIR, path.dirname(dotLiqvidDir));

  const $projectMeta = await loadJson(AutoGenProjectMeta, filename);

  if ($projectMeta.isErr) {
    const error = $projectMeta.unwrapErr();
    if (error instanceof SyntaxError) {
      console.error(`JSON error in ${filename}`, error);
    } else if ($projectMeta instanceof ZodError) {
      console.error(`invalid ProjectMeta format in ${filename}`, error);
    }
    console.error(error);
    return;
  }
  const projectMeta = $projectMeta.unwrap();

  const project = projects[projectPath];
  if (!project) {
    console.error(`could not find project ${projectPath}`);
    return;
  }

  project.duration = new Duration(projectMeta.duration);
}

/**
 * Whether a project has an Open Graph image defined.
 */
function hasOpenGraphImage(dirname: string) {
  const filenames = [
    "opengraph-image.gif",
    "opengraph-image.jpeg",
    "opengraph-image.jpg",
    "opengraph-image.png",
  ];
  return filenames.some((f) => fs.existsSync(path.join(dirname, f)));
}

/**
 * Whether a project has a Twitter image defined.
 */
function hasTwitterImage(dirname: string) {
  const filenames = [
    "twitter-image.gif",
    "twitter-image.jpeg",
    "twitter-image.jpg",
    "twitter-image.png",
  ];
  return filenames.some((f) => fs.existsSync(path.join(dirname, f)));
}

function parseAspectRatio(value: unknown): AspectRatio {
  const defaultValue = { height: 9, width: 16 } as const satisfies AspectRatio;

  switch (typeof value) {
    case "object": {
      if (value === null) return defaultValue;
      if (Array.isArray(value)) {
        const [width, height] = value;
        if (typeof width === "number" && typeof height === "number") {
          return { height, width };
        }
      }
      break;
    }
    case "string": {
      const [width, height] = value.split(":").map(Number);
      if (typeof width === "number" && typeof height === "number") {
        return { height, width };
      }
      break;
    }
    case "undefined":
      return defaultValue;
  }

  throw new Error(`Invalid aspect ratio: ${value}`);
}
async function generateProjectDir({
  dirname,
}: {
  biomePath: Maybe<string>;
  dirname: string;
}) {
  const assetsDir = path.join(dirname, ASSETS_DIRNAME);
  if (!fs.existsSync(assetsDir)) {
    await fsp.mkdir(assetsDir);
  }
}
