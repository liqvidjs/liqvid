import * as fs from "node:fs";
import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { loadJson } from "@liqvid/cli/utils";
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
  References,
  Stream,
} from "effect";
import {
  type AbsoluteDir,
  AbsoluteFile,
  type RelativeDir,
  RelativeFile,
  type RelativePath,
} from "effect-paths";

import {
  ASSETS_DIR,
  NEXT_APP_DIR,
  PROJECT_FILE,
  PROJECT_META_FILE,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import { walkDir } from "../utils/fs.mts";
import { getLogLevel } from "../utils/misc.mts";

type Projects = Record<string, ProjectMeta>;

interface Context {
  basename: RelativeFile;
  dirname: AbsoluteDir;
  filename: AbsoluteFile;
  projects: Projects;
}

/**
 * A file-system change event within the watched project tree, with the raw
 * relative path already resolved into its constituent parts.
 */
type WatchEvent =
  | {
      basename: RelativeFile;
      dirname: AbsoluteDir;
      filename: AbsoluteFile;
    }
  | {
      basename: RelativeDir;
      dirname: AbsoluteDir;
      filename: AbsoluteDir;
    };

export async function watchProjectFiles(projects: Projects) {
  console.log(chalk.blue("Watching project files..."));
  const { cwd } = getServerState();
  const TARGET_DIR = path.join(cwd, NEXT_APP_DIR);

  // initial check
  await walkDir(
    TARGET_DIR,
    async ({ basename, dirname, filename }) => {
      // initialize project metadata
      if (basename === PROJECT_FILE) {
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
      Effect.provideService(References.MinimumLogLevel, getLogLevel()),
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
  targetDir: AbsoluteDir,
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
          const rel = event.path as RelativePath;
          const filename = path.join(targetDir, rel);

          return {
            basename: path.basename(rel),
            dirname: path.dirname(filename),
            filename,
          } as WatchEvent;
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

    yield* Effect.log("watchEvent", event);

    switch (basename) {
      case PROJECT_FILE: {
        yield* handleProjectJson({
          basename,
          dirname,
          filename: AbsoluteFile(filename),
          projects,
        });
        break;
      }
      case PROJECT_META_FILE: {
        yield* handleProjectMeta({
          basename,
          dirname,
          filename: AbsoluteFile(filename),
          projects,
        });
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
  }).pipe(Effect.annotateLogs({ _operation: "handleWatchEvent" }));
}

/**
 * Handle new or deleted project.json files
 */
function handleProjectJson({ dirname, filename, projects }: Context) {
  const { cwd } = getServerState();
  const TARGET_DIR = path.join(cwd, NEXT_APP_DIR);

  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    yield* Effect.logInfo(`handling project.json change`);

    const entryFile = path.join(dirname, RelativeFile("page.tsx"));

    yield* Effect.logDebug("debug testing");

    if (!(yield* fs.exists(entryFile))) {
      yield* Effect.log(`no page.tsx found in ${dirname}, skipping`).pipe(
        Effect.annotateLogs({ entryFile }),
      );
      return;
    }

    // read project file
    const project = yield* loadJson(ProjectJson, filename);

    yield* Effect.log(`loaded project.json`, project);

    const meta: ProjectMeta = {
      ...project,
      aspectRatio: parseAspectRatio(project.aspectRatio),
      duration: new Duration({ milliseconds: 1000 }),
      openGraph: hasOpenGraphImage(dirname),
      path: path.relative(TARGET_DIR, dirname),
      twitter: hasTwitterImage(dirname),
    };

    yield* Effect.logDebug("got project meta", meta);

    projects[meta.path] = meta;

    yield* Effect.logDebug("generating assets dir");

    yield* generateAssetsDir({ dirname });

    yield* Effect.logDebug("generated assets dir");
  }).pipe(
    Effect.annotateLogs({ _operation: "handleProjectJson", dirname, filename }),
  );
}

/**
 * Handle new or deleted project.json files
 */
function createProject({ dirname, filename, projects }: Context) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const { cwd } = getServerState();
    const TARGET_DIR = path.join(cwd, NEXT_APP_DIR);

    const entryFile = path.join(dirname, RelativeFile("page.tsx"));

    if (!(yield* fs.exists(entryFile))) {
      return;
    }

    // read project file
    const project = yield* loadJson(ProjectJson, filename);

    // read duration
    const duration = yield* loadJson(
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
  }).pipe(Effect.annotateLogs({ _operation: "createProject" }));
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
    const projectPath = path.dirname(dotLiqvidDir);

    const projectMeta = yield* loadJson(AutoGenProjectMeta, filename);

    const project = projects[projectPath];
    if (!project) {
      console.error(`could not find project ${projectPath}`);
      return;
    }

    project.duration = new Duration(projectMeta.duration);
  }).pipe(Effect.annotateLogs({ _operation: "handleProjectMeta" }));
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
  const TARGET_DIR = path.join(cwd, NEXT_APP_DIR);

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
  const TARGET_DIR = path.join(cwd, NEXT_APP_DIR);

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

function generateAssetsDir({ dirname }: { dirname: AbsoluteDir }) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const assetsDir = path.join(dirname, ASSETS_DIR);

    if (yield* fs.exists(assetsDir)) return;

    yield* fs.makeDirectory(assetsDir);
  });
}
