import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { loadJson } from "@liqvid/cli/utils";
import { Duration } from "@liqvid/duration";
import {
  type AspectRatio,
  AutoGenProjectMeta,
  ProjectJson,
  type ProjectMeta,
} from "@liqvid/schemas";
import { dirNameToPackageName } from "@liqvid/studio-plugin-api";
import chalk from "chalk";
import {
  Cause,
  Effect,
  FileSystem,
  Layer,
  Logger,
  Option,
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

import { loadRecordingMeta } from "../api/recording.mts";
import {
  ASSETS_DIR,
  NEXT_PAGE,
  PROJECT_FILE,
  PROJECT_META_FILE,
  RECORDING_META_FILE,
  RECORDINGS_DIR,
} from "../conventions.mts";
import { broadcast } from "../next/websockets.mts";
import { existenceOptional } from "../utils/effect.mts";
import { walkDir } from "../utils/fs.mts";
import { getLogLevel, inRoutesDir } from "../utils/misc.mts";

type Projects = Record<RelativeDir, Schema.Struct.Mutable<ProjectMeta>>;

interface Context {
  basename: RelativeFile;
  dirname: AbsoluteDir;
  filename: AbsoluteFile;
  relative: RelativeFile;
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
      relative: RelativeFile;
      kind: "file";
    }
  | {
      basename: RelativeDir;
      dirname: AbsoluteDir;
      filename: AbsoluteDir;
      relative: RelativeDir;
      kind: "dir";
    };

export async function watchProjectFiles(projects: Projects) {
  console.log(chalk.blue("Watching project files..."));
  const TARGET_DIR = inRoutesDir();

  // initial check
  await walkDir(
    TARGET_DIR,
    async ({ basename, dirname, filename }) => {
      // initialize project metadata
      if (basename === PROJECT_FILE) {
        await Effect.runPromise(
          createProject({
            basename,
            dirname,
            filename,
            projects,
            relative: path.relative(TARGET_DIR, filename),
          }).pipe(
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
            const relative = normalizeEditorTempPath(rawRel);
            const rewritten = relative !== rawRel;
            const filename = path.join(targetDir, relative);

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
                  basename: RelativeDir(path.basename(relative)),
                  dirname,
                  filename: AbsoluteDir(filename),
                  kind: "dir",
                  relative: RelativeDir(relative),
                } satisfies WatchEvent)
              : ({
                  basename: RelativeFile(path.basename(relative)),
                  dirname,
                  filename: AbsoluteFile(filename),
                  kind: "file",
                  relative: RelativeFile(relative),
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
    // A recording is a directory under `.liqvid/recordings/`; its removal (as
    // opposed to a change to its `recording-meta.json`) surfaces as a dir
    // event, so handle those here before bailing on non-file events.
    if (event.kind === "dir") {
      if (path.basename(event.dirname) === RECORDINGS_DIR) {
        yield* handleRecordingDir(event.filename);
      }
      return;
    }

    const { basename } = event;

    yield* Effect.logDebug("watchEvent", event);

    switch (basename) {
      case PROJECT_FILE: {
        yield* handleProjectJson({ ...event, projects });
        break;
      }
      case PROJECT_META_FILE: {
        yield* handleProjectMeta({ ...event, projects });
        break;
      }
      case RECORDING_META_FILE: {
        yield* handleRecordingMeta({ ...event, projects });
        break;
      }
      default: {
        // Handle opengraph-image and twitter-image changes
        if (isOpenGraphImage(basename)) {
          handleOpenGraphImage({ ...event, projects });
        } else if (isTwitterImage(basename)) {
          handleTwitterImage({ ...event, projects });
        }
      }
    }
  }).pipe(Effect.annotateLogs({ _operation: "handleWatchEvent" }));
}

/**
 * Handle new or deleted project.json files
 */
function handleProjectJson({ dirname, filename, projects, relative }: Context) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    yield* Effect.logDebug(`handling project.json change`);

    const entryFile = path.join(dirname, NEXT_PAGE);

    if (!(yield* fs.exists(entryFile))) {
      yield* Effect.log(`no page.tsx found in ${dirname}, skipping`).pipe(
        Effect.annotateLogs({ entryFile }),
      );
      return;
    }

    // read project file
    const project = yield* loadJson(ProjectJson, filename);

    yield* Effect.log(`loaded project.json`, project);

    const projectPath = path.dirname(relative);

    const meta: ProjectMeta = {
      ...project,
      aspectRatio: parseAspectRatio(project.aspectRatio),
      duration:
        projects[projectPath]?.duration ?? new Duration({ seconds: 1000 }),
      openGraph: hasOpenGraphImage(dirname),
      path: projectPath,
      twitter: hasTwitterImage(dirname),
    };

    yield* Effect.logDebug("got project meta", meta);

    if (projectPath in meta) {
      yield* broadcast("projects", { data: meta, type: "updateProject" });
    } else {
      yield* broadcast("projects", { data: meta, type: "newProject" });
    }

    projects[projectPath] = meta;

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
function createProject({ dirname, filename, projects, relative }: Context) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const entryFile = path.join(dirname, NEXT_PAGE);

    if (!(yield* fs.exists(entryFile))) {
      return;
    }

    // read project file
    const project = yield* loadJson(ProjectJson, filename);

    // read duration
    const duration = (yield* loadJson(
      AutoGenProjectMeta,
      path.join(dirname, ASSETS_DIR, PROJECT_META_FILE),
    ).pipe(
      Effect.map((meta) => new Duration(meta.duration)),
      existenceOptional,
    )).pipe(Option.getOrElse(() => new Duration({ seconds: 1000 })));

    const meta: ProjectMeta = {
      ...project,
      aspectRatio: parseAspectRatio(project.aspectRatio),
      duration,
      openGraph: hasOpenGraphImage(dirname),
      path: path.dirname(relative),
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
  relative,
}: Context) {
  return Effect.gen(function* () {
    const projectPath = path.dirname(path.dirname(relative));

    const projectMeta = yield* loadJson(AutoGenProjectMeta, filename);

    const project = projects[projectPath];
    if (!project) {
      return yield* Effect.logError(`could not find project ${projectPath}`);
    }

    project.duration = new Duration(projectMeta.duration);
  }).pipe(
    Effect.annotateLogs({
      _operation: "handleProjectMeta",
      dotLiqvidDir,
      projects: Object.keys(projects),
    }),
  );
}

/**
 * Handle removal of a recording directory (`.liqvid/recordings/<name>`).
 *
 * Creation is handled via the `recording-meta.json` file event once the
 * metadata is actually written, so this only acts on directories that no
 * longer exist.
 */
function handleRecordingDir(recordingDir: AbsoluteDir) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    if (yield* fs.exists(recordingDir)) return;

    const recordingsDir = AbsoluteDir(path.dirname(recordingDir));
    const assetsDir = AbsoluteDir(path.dirname(recordingsDir));
    const projectDir = AbsoluteDir(path.dirname(assetsDir));

    if (path.basename(assetsDir) !== ASSETS_DIR) return;

    const url = pathToFileURL(path.join(projectDir, NEXT_PAGE)).href;
    const name = dirNameToPackageName(path.basename(recordingDir));

    yield* broadcast("recordings", {
      data: { name, url },
      type: "deleteRecording",
    });
  }).pipe(
    Effect.annotateLogs({ _operation: "handleRecordingDir", recordingDir }),
  );
}

/**
 * Handle creation, modification, or deletion of a recording's
 * `recording-meta.json`.
 *
 * A recording lives at `<project>/.liqvid/recordings/<name>/`, so the meta
 * file's directory is the recording directory, whose grandparent (via the
 * `recordings` and `.liqvid` dirs) is the project directory. Whether the file
 * still exists tells create/update from delete.
 */
function handleRecordingMeta({ dirname: recordingDir, filename }: Context) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Validate the expected `.liqvid/recordings/<name>` structure.
    const recordingsDir = AbsoluteDir(path.dirname(recordingDir));
    const assetsDir = AbsoluteDir(path.dirname(recordingsDir));
    const projectDir = AbsoluteDir(path.dirname(assetsDir));

    if (
      path.basename(recordingsDir) !== RECORDINGS_DIR ||
      path.basename(assetsDir) !== ASSETS_DIR
    ) {
      return;
    }

    // The recording dialog is scoped by the `file://` URL of the project's
    // `page.tsx`, so broadcast that as the discriminator.
    const url = pathToFileURL(path.join(projectDir, NEXT_PAGE)).href;
    const name = dirNameToPackageName(path.basename(recordingDir));

    if (!(yield* fs.exists(filename))) {
      yield* broadcast("recordings", {
        data: { name, url },
        type: "deleteRecording",
      });
      return;
    }

    const recording = yield* loadRecordingMeta(recordingDir);

    yield* broadcast("recordings", {
      data: { recording, url },
      type: "newRecording",
    });
  }).pipe(
    Effect.catchTag("FileDecodeError", (error) =>
      Effect.logWarning("failed to read recording-meta.json", error),
    ),
    Effect.annotateLogs({ _operation: "handleRecordingMeta", filename }),
  );
}

const OPENGRAPH_IMAGE_FILENAMES = [
  "opengraph-image.gif",
  "opengraph-image.jpeg",
  "opengraph-image.jpg",
  "opengraph-image.png",
] as RelativeFile[];

const TWITTER_IMAGE_FILENAMES = [
  "twitter-image.gif",
  "twitter-image.jpeg",
  "twitter-image.jpg",
  "twitter-image.png",
] as RelativeFile[];

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
function handleOpenGraphImage({ dirname, projects, relative }: Context) {
  const projectPath = path.dirname(relative);
  const project = projects[projectPath];
  if (!project) return;

  project.openGraph = hasOpenGraphImage(dirname);
}

/**
 * Handle twitter-image file creation or deletion.
 */
function handleTwitterImage({ dirname, relative, projects }: Context) {
  const projectPath = path.dirname(relative);
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
