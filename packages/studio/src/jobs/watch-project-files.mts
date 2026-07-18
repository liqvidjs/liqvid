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
  type Schema,
  Stream,
} from "effect";
import {
  AbsoluteDir,
  AbsoluteFile,
  RelativeDir,
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
import { broadcast } from "../next/websockets.mts";
import { walkDir } from "../utils/fs.mts";
import { getLogLevel } from "../utils/misc.mts";

type Projects = Record<string, Schema.Struct.Mutable<ProjectMeta>>;

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
      kind: "file";
    }
  | {
      basename: RelativeDir;
      dirname: AbsoluteDir;
      filename: AbsoluteDir;
      kind: "dir";
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
      //
      // The OS watcher (and editors' atomic-save shuffles) frequently emit
      // several events for a single logical file change, which would otherwise
      // fan out into duplicate broadcasts. Group events by their resolved
      // filename and debounce each group so a burst collapses into a single
      // dispatch. Idle groups are torn down after `idleTimeToLive`.
      yield* Stream.fromPubSub(pubsub).pipe(
        Stream.groupBy(
          (event) => Effect.succeed([event.filename, event] as const),
          { idleTimeToLive: "1 seconds" },
        ),
        Stream.mapEffect(
          ([, group]) =>
            group.pipe(
              Stream.debounce("50 millis"),
              Stream.runForEach((event) =>
                handleWatchEvent(event, projects).pipe(
                  Effect.tapCause((cause) =>
                    Effect.logError(Cause.pretty(cause)),
                  ),
                  Effect.ignore,
                ),
              ),
            ),
          { concurrency: "unbounded" },
        ),
        Stream.runDrain,
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
        Stream.mapEffect((event) =>
          Effect.gen(function* () {
            // Editors like Vim save atomically: they write a backup/temp file
            // (e.g. `project.json~`) and rename it over the real file. The
            // rename-over-existing is frequently coalesced or dropped by the
            // OS watcher, so we only reliably see the temp-file event. Map it
            // back onto the real file so downstream handlers still fire.
            const rawRel = event.path as RelativePath;
            const rel = normalizeEditorTempPath(rawRel);
            const rewritten = rel !== rawRel;
            const filename = path.join(targetDir, rel);

            // When the path was rewritten from a temp file, the event's `_tag`
            // describes the temp file, not the real file — so ignore it and
            // inspect the real file directly.
            const isDir = yield* isDirectory(
              filename,
              rewritten ? undefined : event,
            );
            const dirname = AbsoluteDir(path.dirname(filename));

            return isDir
              ? ({
                  basename: RelativeDir(path.basename(rel)),
                  dirname,
                  filename: AbsoluteDir(filename),
                  kind: "dir",
                } satisfies WatchEvent)
              : ({
                  basename: RelativeFile(path.basename(rel)),
                  dirname,
                  filename: AbsoluteFile(filename),
                  kind: "file",
                } satisfies WatchEvent);
          }),
        ),
      );
    }),
  );
}

/**
 * Determine whether a watched path refers to a directory. For creation and
 * modification events the path still exists, so we consult the file system.
 * For removal events the path is already gone, so we fall back to a heuristic:
 * paths without an extension are treated as directories.
 */
function isDirectory(
  filename: string,
  event: FileSystem.WatchEvent | undefined,
): Effect.Effect<boolean, never, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    if (event?._tag === "Remove") {
      return path.extname(filename) === "";
    }

    const info = yield* fs.stat(filename).pipe(Effect.option);
    if (info._tag === "None") {
      return path.extname(filename) === "";
    }

    return info.value.type === "Directory";
  });
}

/**
 * Rewrite an editor backup/temp path to the real file it shadows.
 *
 * Editors save atomically via a sidecar file that they then rename over the
 * target. The watcher often only surfaces the sidecar event, so we map it back
 * to the real file. Recognized patterns:
 *
 * - Vim backup:            `project.json~`       → `project.json`
 * - Vim/Emacs numbered:    `project.json.4913`   → (left as-is; not a shadow)
 * - JetBrains/generic:     `project.json.tmp`    → `project.json`
 *
 * Paths that don't match a known temp pattern are returned unchanged.
 */
function normalizeEditorTempPath(rel: RelativePath): RelativePath {
  // Vim backup files: trailing tilde.
  if (rel.endsWith("~")) {
    return rel.slice(0, -1) as RelativePath;
  }

  // Generic `.tmp` sidecar next to the real file.
  if (rel.endsWith(".tmp")) {
    return rel.slice(0, -".tmp".length) as RelativePath;
  }

  return rel;
}

/**
 * Dispatch a single watch event to the appropriate handler.
 */
function handleWatchEvent(event: WatchEvent, projects: Projects) {
  return Effect.gen(function* () {
    if (event.kind !== "file") return;

    const { basename, dirname, filename } = event;

    yield* Effect.logDebug("watchEvent", event);

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

    yield* Effect.logDebug(`handling project.json change`);

    const entryFile = path.join(dirname, RelativeFile("page.tsx"));

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
      duration: new Duration({ seconds: 1000 }),
      openGraph: hasOpenGraphImage(dirname),
      path: path.relative(TARGET_DIR, dirname),
      twitter: hasTwitterImage(dirname),
    };

    yield* Effect.logDebug("got project meta", meta);

    projects[meta.path] = meta;

    yield* broadcast("projects", { data: meta, type: "updateProject" });

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
].map(RelativeFile);

const TWITTER_IMAGE_FILENAMES = [
  "twitter-image.gif",
  "twitter-image.jpeg",
  "twitter-image.jpg",
  "twitter-image.png",
].map(RelativeFile);

/**
 * Whether a filename is an Open Graph image.
 */
function isOpenGraphImage(basename: RelativeFile) {
  return OPENGRAPH_IMAGE_FILENAMES.includes(basename);
}

/**
 * Whether a filename is a Twitter image.
 */
function isTwitterImage(basename: RelativeFile) {
  return TWITTER_IMAGE_FILENAMES.includes(basename);
}

/**
 * Whether a project has an Open Graph image defined.
 */
function hasOpenGraphImage(dirname: AbsoluteDir) {
  return OPENGRAPH_IMAGE_FILENAMES.some((f) =>
    fs.existsSync(path.join(dirname, f)),
  );
}

/**
 * Whether a project has a Twitter image defined.
 */
function hasTwitterImage(dirname: AbsoluteDir) {
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
  dirname: AbsoluteDir;
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
  dirname: AbsoluteDir;
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
