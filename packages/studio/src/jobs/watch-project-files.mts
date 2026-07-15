import * as fs from "node:fs";
import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { loadJsonEffect } from "@liqvid/cli/utils";
import { Duration } from "@liqvid/duration";
import type { AspectRatio } from "@liqvid/schemas";
import {
  AutoGenProjectMeta,
  ProjectJson,
  type ProjectMeta,
} from "@liqvid/schemas/effect";
import chalk from "chalk";
import {
  Cause,
  Effect,
  FileSystem,
  Layer,
  Logger,
  type PlatformError,
  PubSub,
  Stream,
} from "effect";

import {
  ASSETS_DIR,
  PROJECT_FILE,
  PROJECT_META_FILE,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import { walkDir } from "../utils/fs.mts";

type Projects = Record<string, ProjectMeta>;

interface Context {
  basename: string;
  dirname: string;
  filename: string;
  projects: Projects;
}

/**
 * A file-system change event within the watched project tree, with the raw
 * relative path already resolved into its constituent parts.
 */
interface WatchEvent {
  basename: string;
  dirname: string;
  filename: string;
}

export async function watchProjectFiles(projects: Projects) {
  console.log(chalk.blue("Watching project files..."));
  const { cwd } = getServerState();
  const TARGET_DIR = path.join(cwd, "app");

  // initial check
  await walkDir(
    TARGET_DIR,
    async ({ basename, dirname, filename }) => {
      // initialize project metadata
      if (basename === "project.json") {
        await Effect.runPromise(
          createProject({ basename, dirname, filename, projects }).pipe(
            Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
            Effect.provide(
              Layer.mergeAll(
                NodeFileSystem.layer,
                Logger.layer([
                  Logger.consolePretty({
                    colors: true,
                    mode: "tty",
                  }),
                ]),
              ),
            ),
          ),
        );
      }
    },
    ({ basename }) => {
      if (basename === ASSETS_DIR) return false;
      return true;
    },
  );

  // set up watch: a Pub/Sub fans watch events out to the consumer that
  // dispatches them to the appropriate handler. The watcher lives for the
  // lifetime of the process, so we run it in a detached root fiber and return
  // once it has been started.
  Effect.runFork(
    Effect.gen(function* () {
      const pubsub = yield* PubSub.unbounded<WatchEvent>();

      // Consumer: subscribe to the Pub/Sub and dispatch each event.
      yield* Stream.fromPubSub(pubsub).pipe(
        Stream.runForEach((event) =>
          handleWatchEvent(event, projects).pipe(
            Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
            Effect.ignore,
          ),
        ),
        Effect.forkScoped,
      );

      // Producer: pump fs.watch events into the Pub/Sub. This runs forever,
      // keeping the scope (and the forked consumer) alive.
      yield* watchFileEvents(TARGET_DIR).pipe(
        Stream.runForEach((event) => PubSub.publish(pubsub, event)),
        Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
      );
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeFileSystem.layer,
          Logger.layer([Logger.consolePretty({ colors: true, mode: "tty" })]),
        ),
      ),
      Effect.scoped,
    ),
  );
}

/**
 * A stream of file-system change events for the given directory, backed by the
 * platform's recursive `FileSystem.watch`. Each raw event's absolute path is
 * decomposed into its constituent parts.
 */
function watchFileEvents(
  targetDir: string,
): Stream.Stream<
  WatchEvent,
  PlatformError.PlatformError,
  FileSystem.FileSystem
> {
  return Stream.unwrap(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      return fs.watch(targetDir).pipe(
        Stream.map((event) => {
          const filename = event.path;
          return {
            basename: path.basename(filename),
            dirname: path.dirname(filename),
            filename,
          } satisfies WatchEvent;
        }),
      );
    }),
  );
}

/**
 * Dispatch a single watch event to the appropriate handler.
 */
function handleWatchEvent(event: WatchEvent, projects: Projects) {
  return Effect.gen(function* () {
    const { basename, dirname, filename } = event;

    switch (basename) {
      case PROJECT_FILE: {
        yield* handleProjectJson({ basename, dirname, filename, projects });
        break;
      }
      case PROJECT_META_FILE: {
        yield* handleProjectMeta({ basename, dirname, filename, projects });
        break;
      }
      default: {
        // Handle opengraph-image and twitter-image changes
        if (isOpenGraphImage(basename)) {
          handleOpenGraphImage({ dirname, projects });
        } else if (isTwitterImage(basename)) {
          handleTwitterImage({ dirname, projects });
        }
      }
    }
  }).pipe(Effect.annotateLogs({ operation: "handleWatchEvent" }));
}

/**
 * Handle new or deleted project.json files
 */
function handleProjectJson({ dirname, filename, projects }: Context) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const entryFile = path.join(dirname, "page.tsx");
    const { cwd } = getServerState();
    const TARGET_DIR = path.join(cwd, "app");

    if (!(yield* fs.exists(entryFile))) {
      return;
    }

    // read project file
    const project = yield* loadJsonEffect(ProjectJson, filename);

    const meta: ProjectMeta = {
      ...project,
      aspectRatio: parseAspectRatio(project.aspectRatio),
      duration: new Duration({ milliseconds: 1000 }),
      openGraph: hasOpenGraphImage(dirname),
      path: path.relative(TARGET_DIR, dirname),
      twitter: hasTwitterImage(dirname),
    };

    projects[meta.path] = meta;

    yield* generateAssetsDir({ dirname });
  });
}

/**
 * Handle new or deleted project.json files
 */
function createProject({ dirname, filename, projects }: Context) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const { cwd } = getServerState();
    const TARGET_DIR = path.join(cwd, "app");

    const entryFile = path.join(dirname, "page.tsx");

    if (!(yield* fs.exists(entryFile))) {
      return;
    }

    // read project file
    const project = yield* loadJsonEffect(ProjectJson, filename);

    // read duration
    const duration = yield* loadJsonEffect(
      AutoGenProjectMeta,
      path.join(dirname, ASSETS_DIR, PROJECT_META_FILE),
    ).pipe(Effect.map((meta) => new Duration(meta.duration)));

    const meta: ProjectMeta = {
      ...project,
      aspectRatio: parseAspectRatio(project.aspectRatio),
      duration,
      openGraph: hasOpenGraphImage(dirname),
      path: path.relative(TARGET_DIR, dirname),
      twitter: hasTwitterImage(dirname),
    };

    projects[meta.path] = meta;

    yield* generateAssetsDir({ dirname });
  }).pipe(Effect.annotateLogs({ operation: "createProject" }));
}

/**
 * Handle auto-generated project-meta.json files
 */
function handleProjectMeta({
  dirname: dotLiqvidDir,
  filename,
  projects,
}: Context) {
  return Effect.gen(function* () {
    const { cwd } = getServerState();
    const TARGET_DIR = path.join(cwd, "app");

    const projectPath = path.dirname(dotLiqvidDir);

    const projectMeta = yield* loadJsonEffect(
      AutoGenProjectMeta,
      path.join(TARGET_DIR, filename),
    );

    const project = projects[projectPath];
    if (!project) {
      console.error(`could not find project ${projectPath}`);
      return;
    }

    project.duration = new Duration(projectMeta.duration);
  }).pipe(Effect.annotateLogs({ operation: "handleProjectMeta" }));
}

const OPENGRAPH_IMAGE_FILENAMES = [
  "opengraph-image.gif",
  "opengraph-image.jpeg",
  "opengraph-image.jpg",
  "opengraph-image.png",
];

const TWITTER_IMAGE_FILENAMES = [
  "twitter-image.gif",
  "twitter-image.jpeg",
  "twitter-image.jpg",
  "twitter-image.png",
];

/**
 * Whether a filename is an Open Graph image.
 */
function isOpenGraphImage(basename: string) {
  return OPENGRAPH_IMAGE_FILENAMES.includes(basename);
}

/**
 * Whether a filename is a Twitter image.
 */
function isTwitterImage(basename: string) {
  return TWITTER_IMAGE_FILENAMES.includes(basename);
}

/**
 * Whether a project has an Open Graph image defined.
 */
function hasOpenGraphImage(dirname: string) {
  return OPENGRAPH_IMAGE_FILENAMES.some((f) =>
    fs.existsSync(path.join(dirname, f)),
  );
}

/**
 * Whether a project has a Twitter image defined.
 */
function hasTwitterImage(dirname: string) {
  return TWITTER_IMAGE_FILENAMES.some((f) =>
    fs.existsSync(path.join(dirname, f)),
  );
}

/**
 * Handle opengraph-image file creation or deletion.
 */
function handleOpenGraphImage({
  dirname,
  projects,
}: {
  dirname: string;
  projects: Projects;
}) {
  const { cwd } = getServerState();
  const TARGET_DIR = path.join(cwd, "app");

  const projectPath = path.relative(TARGET_DIR, dirname);
  const project = projects[projectPath];
  if (!project) return;

  project.openGraph = hasOpenGraphImage(dirname);
}

/**
 * Handle twitter-image file creation or deletion.
 */
function handleTwitterImage({
  dirname,
  projects,
}: {
  dirname: string;
  projects: Projects;
}) {
  const { cwd } = getServerState();
  const TARGET_DIR = path.join(cwd, "app");

  const projectPath = path.relative(TARGET_DIR, dirname);
  const project = projects[projectPath];
  if (!project) return;

  project.twitter = hasTwitterImage(dirname);
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

function generateAssetsDir({ dirname }: { dirname: string }) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const assetsDir = path.join(dirname, ASSETS_DIR);

    if (yield* fs.exists(assetsDir)) return;

    yield* fs.makeDirectory(assetsDir);
  });
}
