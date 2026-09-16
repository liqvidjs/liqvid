import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { loadJson } from "@liqvid/cli/utils";
import { Duration } from "@liqvid/duration";
import {
  type AspectRatio,
  AutoGenProjectMeta,
  type ParametrizedValueEntry,
  ProjectJson,
  type ProjectMeta,
} from "@liqvid/schemas";
import { dirNameToPackageName } from "@liqvid/studio-plugin-api";
import {
  Cause,
  Effect,
  FileSystem,
  Option,
  type PlatformError,
  PubSub,
  type Schema,
  Stream,
} from "effect";
import {
  AbsoluteDir,
  AbsoluteFile,
  type AbsolutePath,
  RelativeDir,
  RelativeFile,
  type RelativePath,
} from "effect-paths";

import { loadRecordingMeta } from "#_/api/recording.mjs";
import {
  ASSETS_DIR,
  NEXT_PAGE,
  PROJECT_FILE,
  PROJECT_META_FILE,
  PROJECT_PATH,
  RECORDING_META_FILE,
  RECORDINGS_DIR,
  SOCIALS_DIR,
} from "#_/conventions.mjs";
import { broadcast } from "#_/next/websockets.mjs";
import { serverRuntime } from "#_/server-runtime.mjs";
import { existenceOptional } from "#_/utils/effect.mjs";
import { walkDir } from "#_/utils/fs.mjs";
import { cartesianProduct, getRoutesDir } from "#_/utils/misc.mjs";
import {
  extractParameterNames,
  getDefaultParameterValues,
  getProjectParameterValues,
} from "#_/utils/parameters.mjs";

type Projects = Record<RelativeDir, Schema.Struct.Mutable<ProjectMeta>>;

interface Context {
  basename: RelativeFile;
  dirname: AbsoluteDir;
  filename: AbsoluteFile;
  projects: Projects;
  relative: RelativeFile;
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

/**
 * Perform the initial scan of the project tree, populating `projects` with
 * metadata for every `project.json` found. This runs once, before the watchers
 * are started, so the server has a complete picture of the project layout.
 */
export function initProjectFiles(projects: Projects) {
  const TARGET_DIR = getRoutesDir();

  return Effect.promise(() =>
    walkDir(
      TARGET_DIR,
      async ({ basename, dirname, filename }) => {
        // initialize project metadata
        if (basename === PROJECT_FILE) {
          await serverRuntime.runPromise(
            createProject({
              basename,
              dirname,
              filename,
              projects,
              relative: path.relative(TARGET_DIR, filename),
            }).pipe(
              Effect.tapCause((cause) =>
                Effect.logError(
                  `[project init] Failed to initialize project:`,
                  Cause.pretty(cause),
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
    ),
  );
}

export const watchProjectFiles = Effect.fnUntraced(
  function* (projects: Projects) {
    const TARGET_DIR = getRoutesDir();

    // set up watch: a Pub/Sub fans watch events out to the consumer that
    // dispatches them to the appropriate handler. The watcher lives for the
    // lifetime of the process.
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
        {
          idleTimeToLive: "1 seconds",
        },
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
  },
  (effect) => effect.pipe(Effect.scoped),
);

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

      return fs.watch(targetDir, { recursive: true }).pipe(
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
    }).pipe(Effect.annotateLogs({ _op: "watchFileEvents", targetDir })),
  );
}

/**
 * Determine whether a watched path refers to a directory. For creation and
 * modification events the path still exists, so we consult the file system.
 * For removal events the path is already gone, so we fall back to a heuristic:
 * paths without an extension are treated as directories.
 */
const isDirectory = Effect.fnUntraced(function* (
  filename: AbsolutePath,
  event: FileSystem.WatchEvent | undefined,
) {
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
const handleWatchEvent = Effect.fnUntraced(
  function* (event: WatchEvent, projects: Projects) {
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
          yield* handleOpenGraphImage({ ...event, projects });
        } else if (isTwitterImage(basename)) {
          yield* handleTwitterImage({ ...event, projects });
        } else if (isLiqvidStudioImage(basename)) {
          yield* handleLiqvidStudioImage({ ...event, projects });
        }
      }
    }
  },
  (effect) => effect.pipe(Effect.annotateLogs({ _op: "handleWatchEvent" })),
);

/**
 * Handle new or deleted project.json files
 */
const handleProjectJson = Effect.fnUntraced(
  function* ({ dirname, filename, projects, relative }: Context) {
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
    const project = yield* loadJson(ProjectJson, filename).pipe(
      Effect.tapCauseIf(
        (cause) =>
          cause.reasons.some(
            (reason) =>
              reason._tag === "Fail" && reason.error._tag === "FileDecodeError",
          ),
        (cause) =>
          Effect.logError(`[file watcher] Failed to load project.json:`, cause),
      ),
    );

    yield* Effect.log(`loaded project.json`, project);

    const projectPath = path.dirname(relative);

    const socials = yield* Effect.all({
      liqvidStudio: hasLiqvidStudioImages(dirname, project.parameters),
      openGraph: hasOpenGraphImage(dirname),
      twitter: hasTwitterImage(dirname),
    });

    const meta: ProjectMeta = {
      ...project,
      aspectRatio: parseAspectRatio(project.aspectRatio),
      description: project.description,
      duration:
        projects[projectPath]?.duration ?? new Duration({ seconds: 1000 }),
      parameters: project.parameters,
      path: projectPath,
      socials,
      title: project.title,
    };

    yield* Effect.logDebug("got project meta", meta);

    if (projectPath in meta) {
      yield* broadcast("projects", { data: meta, type: "updateProject" });
    } else {
      yield* broadcast("projects", { data: meta, type: "newProject" });
    }

    projects[projectPath] = meta;

    yield* Effect.logDebug("generating assets dir");

    yield* generateAssetsDir({ dirname, projectPath });

    yield* Effect.logDebug("generated assets dir");
  },
  (effect, { dirname, filename }) =>
    effect.pipe(
      Effect.annotateLogs({ _op: "handleProjectJson", dirname, filename }),
    ),
);

/**
 * Handle new or deleted project.json files
 */
const createProject = Effect.fnUntraced(
  function* ({ dirname, filename, projects, relative }: Context) {
    const fs = yield* FileSystem.FileSystem;

    const entryFile = path.join(dirname, NEXT_PAGE);

    yield* Effect.logDebug("checking for entry file", { entryFile });

    if (!(yield* fs.exists(entryFile))) {
      return;
    }

    // read project file
    const project = yield* loadJson(ProjectJson, filename);

    const projectPath = path.dirname(relative);

    // Determine the correct assets directory for parameterized projects
    // Use default parameter values (first value of each parameter)
    const paramNames = extractParameterNames(projectPath);
    let assetsDir = path.join(dirname, ASSETS_DIR);

    if (paramNames.length > 0) {
      // Get merged parameters (project + root)
      const mergedParams = getProjectParameterValues(project.parameters);
      const defaultValues = getDefaultParameterValues(
        mergedParams as Record<string, string[]>,
      );

      // Build the parameterized subdirectory path
      const paramSubpath = paramNames
        .map((name) => defaultValues[name] ?? "")
        .filter(Boolean)
        .join("/");

      if (paramSubpath) {
        assetsDir = path.join(assetsDir, RelativeDir(paramSubpath));
      }
    }

    // do filesystem operations in parallel
    const { duration: $duration, ...socials } = yield* Effect.all({
      // read duration - try parameterized location first, fall back to base assets dir
      duration: loadJson(
        AutoGenProjectMeta,
        path.join(assetsDir, PROJECT_META_FILE),
      ).pipe(
        Effect.map((meta) => new Duration(meta.duration)),
        existenceOptional,
        // If parameterized location doesn't exist, try base assets dir
        Effect.flatMap((opt) => {
          if (Option.isSome(opt)) return Effect.succeed(opt);
          if (assetsDir !== path.join(dirname, ASSETS_DIR)) {
            return loadJson(
              AutoGenProjectMeta,
              path.join(dirname, ASSETS_DIR, PROJECT_META_FILE),
            ).pipe(
              Effect.map((meta) => Option.some(new Duration(meta.duration))),
              existenceOptional,
              Effect.map(Option.flatten),
            );
          }
          return Effect.succeed(Option.none<Duration>());
        }),
      ),
      liqvidStudio: hasLiqvidStudioImages(dirname, project.parameters),
      openGraph: hasOpenGraphImage(dirname),
      twitter: hasTwitterImage(dirname),
    });

    const duration = $duration.pipe(
      Option.getOrElse(() => new Duration({ seconds: 1000 })),
    );

    const meta: ProjectMeta = {
      ...project,
      aspectRatio: parseAspectRatio(project.aspectRatio),
      description: project.description,
      duration,
      parameters: project.parameters,
      path: projectPath,
      socials,
      title: project.title,
    };

    projects[meta.path] = meta;

    yield* generateAssetsDir({ dirname, projectPath: meta.path });
  },
  (effect, { dirname, filename, relative }) =>
    effect.pipe(
      Effect.annotateLogs({
        _op: "createProject",
        dirname,
        filename,
        relative,
      }),
    ),
);

/**
 * Handle auto-generated project-meta.json files
 *
 * For parameterized projects, project-meta.json can be at:
 * - .liqvid/en/US/project-meta.json (parameterized)
 * - .liqvid/project-meta.json (non-parameterized)
 *
 * We need to find the project by walking up from the .liqvid directory.
 */
const handleProjectMeta = Effect.fnUntraced(
  function* ({ dirname: metaDir, filename, projects, relative }: Context) {
    // Walk up from the meta file's directory to find the .liqvid directory
    // Then the project is one level above .liqvid
    let currentDir = metaDir;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops

    // Find the .liqvid directory
    while (depth < maxDepth && path.basename(currentDir) !== ASSETS_DIR) {
      currentDir = AbsoluteDir(path.dirname(currentDir));
      depth++;
    }

    if (path.basename(currentDir) !== ASSETS_DIR) {
      return yield* Effect.logError(
        `could not find .liqvid directory for ${relative}`,
      );
    }

    // The project directory is one level up from .liqvid
    const projectDir = AbsoluteDir(path.dirname(currentDir));
    const routesDir = getRoutesDir();
    const projectPath = path.relative(routesDir, projectDir);

    const projectMeta = yield* loadJson(AutoGenProjectMeta, filename);

    const project = projects[projectPath];
    if (!project) {
      return yield* Effect.logError(`could not find project ${projectPath}`);
    }

    project.duration = new Duration(projectMeta.duration);
  },
  (effect, { dirname: metaDir, projects }) =>
    effect.pipe(
      Effect.annotateLogs({
        _op: "handleProjectMeta",
        metaDir,
        projects: Object.keys(projects),
      }),
    ),
);

/**
 * Handle removal of a recording directory (`.liqvid/recordings/<name>`).
 *
 * Creation is handled via the `recording-meta.json` file event once the
 * metadata is actually written, so this only acts on directories that no
 * longer exist.
 */
const handleRecordingDir = Effect.fnUntraced(
  function* (recordingDir: AbsoluteDir) {
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
  },
  (effect, recordingDir) =>
    effect.pipe(
      Effect.annotateLogs({ _op: "handleRecordingDir", recordingDir }),
    ),
);

/**
 * Handle creation, modification, or deletion of a recording's
 * `recording-meta.json`.
 *
 * A recording lives at `<project>/.liqvid/recordings/<name>/`, so the meta
 * file's directory is the recording directory, whose grandparent (via the
 * `recordings` and `.liqvid` dirs) is the project directory. Whether the file
 * still exists tells create/update from delete.
 */
const handleRecordingMeta = Effect.fnUntraced(
  function* ({ dirname: recordingDir, filename }: Context) {
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
  },
  (effect, { filename }) =>
    effect.pipe(Effect.annotateLogs({ _op: "handleRecordingMeta", filename })),
);

/* ------------------------------ we order by most common first to speed up checks ------------------------------ */

const LIQVID_STUDIO_FILENAMES_DARK = [
  "liqvid-studio-dark.png",
  "liqvid-studio-dark.jpg",
  "liqvid-studio-dark.jpeg",
  "liqvid-studio-dark.gif",
] as RelativeFile[];

const LIQVID_STUDIO_FILENAMES_LIGHT = [
  "liqvid-studio-light.png",
  "liqvid-studio-light.jpg",
  "liqvid-studio-light.jpeg",
  "liqvid-studio-light.gif",
] as RelativeFile[];

const OPENGRAPH_IMAGE_FILENAMES = [
  "opengraph-image.png",
  "opengraph-image.jpg",
  "opengraph-image.jpeg",
  "opengraph-image.gif",
] as RelativeFile[];

const TWITTER_IMAGE_FILENAMES = [
  "twitter-image.png",
  "twitter-image.jpg",
  "twitter-image.jpeg",
  "twitter-image.gif",
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
 * Whether a filename is a Liqvid Studio image.
 */
function isLiqvidStudioImage(basename: RelativeFile) {
  return (
    LIQVID_STUDIO_FILENAMES_DARK.includes(basename) ||
    LIQVID_STUDIO_FILENAMES_LIGHT.includes(basename)
  );
}

/**
 * Whether a project has an Open Graph image defined.
 */
const hasOpenGraphImage = Effect.fnUntraced(function* (dirname: AbsoluteDir) {
  const fs = yield* FileSystem.FileSystem;

  const exists = yield* Effect.findFirst(OPENGRAPH_IMAGE_FILENAMES, (f) =>
    fs.exists(path.join(dirname, f)),
  );

  return Option.isSome(exists);
});

/**
 * Whether a proejct has Liqvid Studio images defined.
 */
const hasLiqvidStudioImages = Effect.fnUntraced(function* (
  dirname: AbsoluteDir,
  parameters: Readonly<Record<string, readonly string[]>> | undefined,
) {
  const fs = yield* FileSystem.FileSystem;

  if (parameters && Object.keys(parameters).length > 0) {
    return yield* Effect.all(
      cartesianProduct(parameters).map((combination) =>
        Effect.gen(function* () {
          const parameterizedDirname = path.join(
            dirname,
            ASSETS_DIR,
            ...(Object.values(combination) as RelativeDir[]),
            SOCIALS_DIR,
          );

          const { dark, light } = yield* Effect.all(
            {
              dark: Effect.findFirst(LIQVID_STUDIO_FILENAMES_DARK, (f) =>
                fs.exists(path.join(parameterizedDirname, f)),
              ),
              light: Effect.findFirst(LIQVID_STUDIO_FILENAMES_LIGHT, (f) =>
                fs.exists(path.join(parameterizedDirname, f)),
              ),
            },
            { concurrency: "unbounded" },
          );

          const value = Option.isSome(light) && Option.isSome(dark);

          return { ...combination, value } as ParametrizedValueEntry<boolean>;
        }),
      ),
      { concurrency: "unbounded" },
    );
  }

  const { dark, light } = yield* Effect.all(
    {
      dark: Effect.findFirst(LIQVID_STUDIO_FILENAMES_DARK, (f) =>
        fs.exists(path.join(dirname, f)),
      ),
      light: Effect.findFirst(LIQVID_STUDIO_FILENAMES_LIGHT, (f) =>
        fs.exists(path.join(dirname, f)),
      ),
    },
    { concurrency: "unbounded" },
  );

  return Option.isSome(light) && Option.isSome(dark);
});

/**
 * Whether a project has a Twitter image defined.
 */
const hasTwitterImage = Effect.fnUntraced(function* (dirname: AbsoluteDir) {
  const fs = yield* FileSystem.FileSystem;

  const exists = yield* Effect.findFirst(TWITTER_IMAGE_FILENAMES, (f) =>
    fs.exists(path.join(dirname, f)),
  );

  return Option.isSome(exists);
});

/**
 * Handle opengraph-image file creation or deletion.
 */
const handleOpenGraphImage = Effect.fnUntraced(function* ({
  dirname,
  projects,
  relative,
}: Context) {
  const projectPath = path.dirname(relative);
  const project = projects[projectPath];
  if (!project) return;

  project.socials.openGraph = yield* hasOpenGraphImage(dirname);
});

/**
 * Handle twitter-image file creation or deletion.
 */
const handleTwitterImage = Effect.fnUntraced(function* ({
  dirname,
  relative,
  projects,
}: Context) {
  const projectPath = path.dirname(relative);
  const project = projects[projectPath];
  if (!project) return;

  project.socials.twitter = yield* hasTwitterImage(dirname);
});

/**
 * Handle Liqvid Studio image file creation or deletion.
 */
const handleLiqvidStudioImage = Effect.fnUntraced(function* ({
  dirname,
  relative,
  projects,
}: Context) {
  const projectPath = path.dirname(relative);
  const project = projects[projectPath];
  if (!project) return;

  // TODO: inefficient, could do granular updates instead
  project.socials.liqvidStudio = yield* hasLiqvidStudioImages(
    dirname,
    project.parameters,
  );
});

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

      if (
        "height" in value &&
        "width" in value &&
        typeof value.height === "number" &&
        typeof value.width === "number"
      ) {
        return value as AspectRatio;
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

  throw new Error(`Invalid aspect ratio: ${JSON.stringify(value)}`);
}

const generateAssetsDir = Effect.fnUntraced(function* ({
  dirname,
  projectPath,
}: {
  dirname: AbsoluteDir;
  projectPath: RelativeDir;
}) {
  const fs = yield* FileSystem.FileSystem;

  const assetsDir = path.join(dirname, ASSETS_DIR);

  if (!(yield* fs.exists(assetsDir))) {
    yield* fs.makeDirectory(assetsDir);
  }

  // Always write project-path.json so client components can read it at runtime
  yield* fs.writeFileString(
    path.join(assetsDir, PROJECT_PATH),
    JSON.stringify(projectPath),
  );
});
