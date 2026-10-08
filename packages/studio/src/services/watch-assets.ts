import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { loadJson, UP } from "@liqvid/cli/utils";
import {
  AutoGenProjectMeta,
  type ParameterConfig,
  ProjectJson,
  RecordingMetaFile,
} from "@liqvid/schemas";
import { formatTimeMs } from "@liqvid/utils";
import {
  Cache,
  Cause,
  Effect,
  FileSystem,
  Logger,
  Option,
  type PlatformError,
  PubSub,
  Result,
  Stream,
} from "effect";
import {
  AbsoluteDir,
  type AbsoluteFile,
  type AbsolutePath,
  RelativeDir,
  RelativeFile,
  type RelativePath,
} from "effect-paths";
import { execa } from "execa";
import Handlebars from "handlebars";

import {
  ASSETS_DIR,
  DS_STORE,
  NEXT_PAGE,
  PARAMS_MARKER_PREFIX,
  PROJECT_FILE,
  PROJECT_FILES_AUTOGEN,
  PROJECT_META_FILE,
  RECORDING_META_FILE,
  RECORDINGS_DIR,
  TYPES_AUTOGEN,
} from "#_/conventions";
import { getServerState } from "#_/initialize";
import { withLogLevel } from "#_/server-runtime";
import {
  buildChosenRecordingsTree,
  type ChosenRecordingEntry,
  renderChosenRecordingsType,
  treeHasChosenRecordings,
} from "#_/utils/chosen-recordings";
import { existenceOptional, readDirWithFileTypes } from "#_/utils/effect";
import { getBiomePath } from "#_/utils/fs";
import { cartesianProduct, getRoutesDir } from "#_/utils/misc";
import {
  buildParameterSubpath,
  ensureParamsMarker,
  extractParameterNames,
  getProjectParameterValues,
} from "#_/utils/parameters";

/**
 * Files/patterns to exclude from the directory listing (relative to project dir).
 * Code files, config files, and generated images are excluded.
 */
const EXCLUDE_PATTERNS = [
  DS_STORE,
  PROJECT_FILE,
  PROJECT_FILES_AUTOGEN,
  TYPES_AUTOGEN,
  /\.(css|js|jsx|ts|tsx)$/,
  /hls\/.*data\d+\.ts$/,
  /\.d.json.ts$/,
  /^opengraph-image\./,
  /^twitter-image\./,
];

/** Check if a file should be excluded based on patterns */
function shouldExclude(
  relativePath: RelativePath,
  basename: RelativePath,
): boolean {
  // Check exclusion patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (typeof pattern === "string") {
      if (relativePath === pattern || basename === pattern) return true;
    } else if (pattern.test(relativePath)) {
      return true;
    }
  }

  return false;
}

function shouldIgnoreEvent(
  basename: RelativePath,
  filename: AbsolutePath,
): boolean {
  if (filename.endsWith("~")) return true;
  if (basename === DS_STORE) return true;
  if (basename === TYPES_AUTOGEN) return true;
  if (basename === PROJECT_FILES_AUTOGEN) return true;
  return false;
}

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  UP,
  UP,
  RelativeDir("templates"),
);

/**
 * Initialize the parameterized directory structure for a project.
 * Creates directories like `.liqvid/en/US/`, `.liqvid/es/CA/`, etc.
 * for all parameter value combinations.
 */
const initializeParameterizedDirs = Effect.fnUntraced(
  function* (
    assetsDir: AbsoluteDir,
    projectPath: RelativeDir,
    projectParameters: ParameterConfig | undefined,
  ) {
    const fs = yield* FileSystem.FileSystem;

    const paramNames = extractParameterNames(projectPath);
    const expectedMarker =
      paramNames.length > 0
        ? `${PARAMS_MARKER_PREFIX}${paramNames.join(",")}`
        : undefined;

    if (yield* fs.exists(assetsDir)) {
      const entries = yield* fs.readDirectory(assetsDir);
      for (const entry of entries) {
        if (
          entry.startsWith(PARAMS_MARKER_PREFIX) &&
          entry !== expectedMarker
        ) {
          yield* fs.remove(path.join(assetsDir, RelativeFile(entry)));
        }
      }
    }

    if (paramNames.length === 0) {
      // No parameters - nothing to initialize
      return;
    }

    // Get parameter values from project or root config
    const parameterValues = getProjectParameterValues(projectParameters);

    // Generate all combinations
    const combinations = cartesianProduct(parameterValues);

    if (combinations.length === 0) {
      yield* Effect.logDebug("No parameter combinations to initialize");
      return;
    }

    // Create the .params= marker file
    yield* ensureParamsMarker(assetsDir, projectPath);

    // Create directory for each combination
    for (const combo of combinations) {
      const subpath = buildParameterSubpath(paramNames, combo);
      const paramDir = path.join(assetsDir, subpath);

      if (!(yield* fs.exists(paramDir))) {
        yield* fs.makeDirectory(paramDir, { recursive: true });
        yield* Effect.logDebug(`Created parameter directory: ${subpath}`);
      }
    }
  },
  (effect, assetsDir, projectPath) =>
    effect.pipe(Effect.annotateLogs({ assetsDir, projectPath })),
);

/**
 * Check if a directory is a project directory.
 * A project directory contains both project.json and page.tsx.
 */
const isProjectDirectory = Effect.fnUntraced(function* (dir: AbsoluteDir) {
  const fs = yield* FileSystem.FileSystem;

  const { hasPageTsx, hasProjectJson } = yield* Effect.all({
    hasPageTsx: fs.exists(path.join(dir, NEXT_PAGE)),
    hasProjectJson: fs.exists(path.join(dir, PROJECT_FILE)),
  });

  return hasProjectJson && hasPageTsx;
});

/**
 * Find the project directory that contains the given file path.
 * Walks up the directory tree until it finds a project directory or reaches TARGET_DIR.
 */
const findProjectDirectory = Effect.fnUntraced(function* (
  filePath: AbsolutePath,
) {
  let dir = path.dirname(filePath);

  const TARGET_DIR = getRoutesDir();

  while (dir.startsWith(TARGET_DIR) && dir !== TARGET_DIR) {
    if (yield* isProjectDirectory(dir)) {
      return Option.some(dir);
    }
    dir = path.dirname(dir);
  }

  // Check if TARGET_DIR itself is a project directory
  if (dir === TARGET_DIR && (yield* isProjectDirectory(dir))) {
    return Option.some(dir);
  }

  return Option.none();
});

type DirectoryTypes = {
  [key: string]: DirectoryTypes | string | false;
};

type DirectoryStructure = {
  [key: string]: DirectoryStructure | null;
};

type AssetWatchEvent = {
  event: FileSystem.WatchEvent;
  filename: AbsolutePath;
  projectDir: AbsoluteDir;
};

/**
 * Writers into the running asset watcher's caches. A forced regeneration
 * replaces those entries so the next watch event does not write a stale tree
 * back. Absent when the watcher has not been started.
 */
let syncDirectoryStructure:
  | ((
      projectDir: AbsoluteDir,
      structure: DirectoryStructure,
    ) => Effect.Effect<void>)
  | undefined;
let syncChosenRecordings:
  | ((
      projectDir: AbsoluteDir,
      tree: ReturnType<typeof buildChosenRecordingsTree>,
    ) => Effect.Effect<void>)
  | undefined;

const getJsonType = Effect.fnUntraced(function* (jsonPath: AbsoluteFile) {
  const fs = yield* FileSystem.FileSystem;

  if (!jsonPath.endsWith(".json")) return null;

  const declarationPath = path.join(
    path.dirname(jsonPath),
    RelativeFile(path.basename(jsonPath).replace(/\.json$/, ".d.json.ts")),
  );

  if (!(yield* fs.exists(declarationPath))) return null;

  const declaration = yield* fs.readFileString(declarationPath, "utf8");
  if (/(?:^|[;\n])\s*import\s*(?!\()/m.test(declaration)) return null;

  const defaultName = declaration.match(
    /export\s+default\s+([A-Za-z_$][\w$]*)\s*;/,
  )?.[1];

  if (!defaultName) return null;

  return (
    declaration
      .match(
        new RegExp(
          `declare\\s+const\\s+${defaultName}\\s*:\\s*([\\s\\S]*?)\\s*;\\s*export\\s+default\\s+${defaultName}\\s*;`,
        ),
      )?.[1]
      ?.trim() ?? null
  )?.replace(/,(\s*)>/g, "$1>");
});

const getDirectoryTypes = Effect.fnUntraced(function* (
  currentDir: AbsoluteDir,
  directory: DirectoryStructure,
): Effect.fn.Return<
  DirectoryTypes,
  PlatformError.PlatformError,
  FileSystem.FileSystem
> {
  const result: DirectoryTypes = {};

  for (const [basename, value] of Object.entries(directory)) {
    if (value === null) {
      result[basename] =
        (yield* getJsonType(path.join(currentDir, RelativeFile(basename)))) ??
        false;
    } else {
      const child = yield* getDirectoryTypes(
        path.join(currentDir, RelativeDir(basename)),
        value,
      );

      if (Object.keys(child).length > 0) result[basename] = child;
    }
  }

  return result;
});

/**
 * Load the chosen recordings for every parameter combination, with their
 * durations, for generating the `ChosenRecordings` type. The recording names
 * come from each combination's auto-generated `project-meta.json`, and the
 * durations from each recording's own `recording-meta.json`.
 */
const loadChosenRecordings = Effect.fnUntraced(function* (
  assetsDir: AbsoluteDir,
  paramNames: readonly string[],
  parametersRecord: Record<string, readonly string[]>,
) {
  const combinations =
    paramNames.length > 0 ? cartesianProduct(parametersRecord) : [{}];

  return yield* Effect.all(
    combinations.map((combination) =>
      Effect.gen(function* () {
        const values = paramNames.map((name) => combination[name] ?? "");
        const combinationAssetsDir = path.join(
          assetsDir,
          ...(values as RelativeDir[]),
        );

        const meta = yield* loadJson(
          AutoGenProjectMeta,
          path.join(combinationAssetsDir, PROJECT_META_FILE),
        ).pipe(
          existenceOptional,
          Effect.catchTag("FileDecodeError", () =>
            Effect.succeed(Option.none<AutoGenProjectMeta>()),
          ),
        );

        const entries: ChosenRecordingEntry[] = [];

        if (Option.isSome(meta) && meta.value.chosenRecordings) {
          for (const [name, chosen] of Object.entries(
            meta.value.chosenRecordings,
          )) {
            // skip unchosen entries and guard against malformed directory names
            if (!chosen || name.includes("/") || name.includes("..")) continue;

            const recordingMeta = yield* loadJson(
              RecordingMetaFile,
              path.join(
                combinationAssetsDir,
                RECORDINGS_DIR,
                RelativeDir(name),
                RECORDING_META_FILE,
              ),
            ).pipe(
              existenceOptional,
              Effect.catchTag("FileDecodeError", () =>
                Effect.succeed(
                  Option.none<(typeof RecordingMetaFile)["Type"]>(),
                ),
              ),
            );

            if (Option.isSome(recordingMeta)) {
              entries.push({
                duration: formatTimeMs(recordingMeta.value.duration),
                name,
              });
            }
          }
        }

        return { entries, values };
      }),
    ),
    { concurrency: "unbounded" },
  );
});

export const watchAssets = Effect.fnUntraced(
  function* () {
    Handlebars.registerHelper(
      "json",
      (obj) => new Handlebars.SafeString(JSON.stringify(obj, null, 2)),
    );
    Handlebars.registerHelper(
      "isDirectory",
      (value) => typeof value === "object" && value !== null,
    );

    const TARGET_DIR = getRoutesDir();

    // Keep the expensive project-tree crawl and chosen-recording metadata in
    // separate caches: a project-meta refresh must not rebuild ProjectStructure.
    const directoryStructures = yield* Cache.make<
      AbsoluteDir,
      DirectoryStructure,
      PlatformError.PlatformError,
      FileSystem.FileSystem
    >({
      capacity: Number.POSITIVE_INFINITY,
      lookup: (projectDir) => listProjectDir(projectDir),
    });
    const chosenRecordings = yield* Cache.make({
      capacity: Number.POSITIVE_INFINITY,
      lookup: loadChosenRecordingsTree,
    });
    syncDirectoryStructure = (projectDir, structure) =>
      Cache.set(directoryStructures, projectDir, structure);
    syncChosenRecordings = (projectDir, tree) =>
      Cache.set(chosenRecordings, projectDir, tree);

    // A resolved asset change: the project directory whose types.ts should be
    // regenerated for this event.
    type WatchEvent = { projectDir: AbsoluteDir };

    // set up watch: a Pub/Sub fans watch events out to the consumer that
    // regenerates the affected project's types. The watcher lives for the
    // lifetime of the process.
    const pubsub = yield* PubSub.unbounded<WatchEvent>();

    // Consumer: subscribe to the Pub/Sub and regenerate types per project.
    //
    // The OS watcher (and editors' atomic-save shuffles) frequently emit
    // several events for a single logical file change, which would otherwise
    // fan out into duplicate regenerations. Group events by their project
    // directory and debounce each group so a burst collapses into a single
    // dispatch. Idle groups are torn down after `idleTimeToLive`.
    yield* Stream.fromPubSub(pubsub).pipe(
      Stream.groupBy(
        (event) => Effect.succeed([event.projectDir, event] as const),
        { idleTimeToLive: "1 seconds" },
      ),
      Stream.mapEffect(
        ([projectDir, group]) =>
          group.pipe(
            Stream.debounce("50 millis"),
            Stream.runForEach(() =>
              Effect.gen(function* () {
                const biomePath = yield* getBiomePath(projectDir);
                const [directoryStructure, chosenRecordingsTree] =
                  yield* Effect.all([
                    Cache.get(directoryStructures, projectDir),
                    Cache.get(chosenRecordings, projectDir),
                  ]);
                yield* generateProjectTypes({
                  biomePath,
                  chosenRecordingsTree,
                  directoryStructure,
                  projectDir,
                });
              }).pipe(
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

    // Seed both caches from the initial project scan. Project metadata is
    // already populated by initProjectFiles before this service is started.
    for (const projectPath of Object.keys(getServerState().projects)) {
      const projectDir = path.join(TARGET_DIR, RelativeDir(projectPath));
      yield* Cache.get(directoryStructures, projectDir);
      yield* Cache.get(chosenRecordings, projectDir);
      yield* PubSub.publish(pubsub, { projectDir });
    }

    // Producer: pump fs.watch events into the Pub/Sub. This runs forever,
    // keeping the scope (and the forked consumer) alive.
    yield* watchAssetEvents(TARGET_DIR).pipe(
      Stream.runForEach((event) =>
        Effect.gen(function* () {
          yield* updateDirectoryStructure(directoryStructures, event);

          if (isChosenRecordingsInput(event)) {
            yield* Cache.invalidate(chosenRecordings, event.projectDir);
          }

          yield* PubSub.publish(pubsub, { projectDir: event.projectDir });
        }),
      ),
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
    );
  },
  (effect) => effect.pipe(Effect.scoped),
);

/**
 * A stream of asset-relevant change events, backed by the platform's recursive
 * `FileSystem.watch`. Ignorable events (editor temp files, `.DS_Store`, etc.)
 * are dropped, and each remaining event is resolved to the project directory
 * containing it (dropping events that fall outside any project).
 */
function watchAssetEvents(
  targetDir: AbsoluteDir,
): Stream.Stream<AssetWatchEvent, never, FileSystem.FileSystem> {
  return Stream.unwrap(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      return fs.watch(targetDir, { recursive: true }).pipe(
        Stream.filterMapEffect((event) =>
          Effect.gen(function* () {
            const relPath = event.path as RelativePath;
            const filename = path.join(targetDir, relPath);
            const basename = path.basename(filename);

            if (shouldIgnoreEvent(basename, filename))
              return Result.fail(event);

            // Find the project directory containing this file
            const $projectDir = yield* findProjectDirectory(filename);
            if (Option.isNone($projectDir)) return Result.fail(event);

            return Result.succeed({
              event,
              filename,
              projectDir: $projectDir.value,
            });
          }),
        ),
        // A PlatformError from the watcher itself becomes a defect so the
        // detached fiber surfaces it rather than silently completing.
        Stream.orDie,
      );
    }),
  );
}

/**
 * Generate the types.ts file inside the .liqvid directory.
 */
const generateProjectTypes = Effect.fnUntraced(
  function* ({
    biomePath,
    chosenRecordingsTree,
    directoryStructure,
    projectDir,
  }: {
    biomePath: Option.Option<AbsoluteFile>;
    chosenRecordingsTree: ReturnType<typeof buildChosenRecordingsTree>;
    directoryStructure: DirectoryStructure;
    projectDir: AbsoluteDir;
  }) {
    const fs = yield* FileSystem.FileSystem;

    yield* Effect.logDebug(
      `generating ${PROJECT_FILES_AUTOGEN} and ${TYPES_AUTOGEN} `,
    );

    const directoryTypes = yield* getDirectoryTypes(
      projectDir,
      directoryStructure,
    );
    const assetsDir = path.join(projectDir, ASSETS_DIR);

    // Read project.json to extract parameters
    const projectFile = path.join(projectDir, PROJECT_FILE);
    const project = yield* loadJson(ProjectJson, projectFile);

    // Use project parameters if defined, otherwise fall back to rootParameters from config
    let parametersRecord: Record<string, readonly string[]>;
    if (project.parameters) {
      parametersRecord = project.parameters;
    } else {
      // Fall back to rootParameters from liqvid.json
      const { config } = getServerState();
      parametersRecord = Option.isSome(config)
        ? (config.value.rootParameters ?? {})
        : {};
    }

    // Transform parameters into array format for template
    const parameters = Object.entries(parametersRecord).map(
      ([name, values]) => ({
        name,
        values,
      }),
    );

    // Ensure .liqvid directory exists
    yield* fs.makeDirectory(assetsDir, { recursive: true });

    // Initialize parameterized directory structure if project has parameters
    const routesDir = getRoutesDir();
    const projectPath = path.relative(routesDir, projectDir);
    yield* initializeParameterizedDirs(
      assetsDir,
      projectPath,
      project.parameters,
    );

    yield* withLogLevel(
      Effect.all([
        fs.writeFileString(
          path.join(assetsDir, PROJECT_FILES_AUTOGEN),
          JSON.stringify(directoryStructure, null, 2),
        ),
        runTemplate({
          biomePath,
          data: {
            chosenRecordings: renderChosenRecordingsType(chosenRecordingsTree),
            directoryTypes,
            hasChosenRecordings: treeHasChosenRecordings(chosenRecordingsTree),
            parameters,
          },
          out: path.join(assetsDir, TYPES_AUTOGEN),
          template: RelativeFile(`${TYPES_AUTOGEN}.hbs`),
        }),
      ]),
    ).pipe(
      // Send these logs to the console, not the service's structured logger.
      Effect.provide(Logger.layer([Logger.consolePretty()])),
    );
  },
  (effect, projectDir) => effect.pipe(Effect.annotateLogs({ projectDir })),
);

/**
 * Load the chosen recordings for one project. This is the lookup function for
 * the chosen-recordings cache and is invalidated by relevant watch events.
 */
const loadChosenRecordingsTree = Effect.fnUntraced(function* (
  projectDir: AbsoluteDir,
) {
  const project = yield* loadJson(
    ProjectJson,
    path.join(projectDir, PROJECT_FILE),
  );
  const projectPath = path.relative(getRoutesDir(), projectDir);
  const parametersRecord =
    project.parameters ??
    (() => {
      const { config } = getServerState();
      return Option.isSome(config) ? (config.value.rootParameters ?? {}) : {};
    })();
  const assetsDir = path.join(projectDir, ASSETS_DIR);

  return buildChosenRecordingsTree(
    yield* loadChosenRecordings(
      assetsDir,
      extractParameterNames(projectPath),
      parametersRecord,
    ),
  );
});

/**
 * Force a full rescan and rewrite `project-files.json` and `types.ts`.
 *
 * Unlike the watcher, this does not apply an incremental cache update — it
 * rebuilds the tree from the filesystem. If the asset watcher is running, its
 * caches are replaced so a later event does not write the previous tree back.
 */
export const regenerateProjectFiles = Effect.fnUntraced(function* (
  projectDir: AbsoluteDir,
) {
  const project = yield* loadJson(
    ProjectJson,
    path.join(projectDir, PROJECT_FILE),
  );
  const projectPath = path.relative(getRoutesDir(), projectDir);
  const assetsDir = path.join(projectDir, ASSETS_DIR);

  // Reconcile the parameter marker before scanning so stale markers from an
  // earlier route shape are not copied into the new manifest.
  yield* initializeParameterizedDirs(
    assetsDir,
    projectPath,
    project.parameters,
  );

  const directoryStructure = yield* listProjectDir(projectDir);
  const chosenRecordingsTree = yield* loadChosenRecordingsTree(projectDir);

  if (syncDirectoryStructure) {
    yield* syncDirectoryStructure(projectDir, directoryStructure);
  }
  if (syncChosenRecordings) {
    yield* syncChosenRecordings(projectDir, chosenRecordingsTree);
  }

  const biomePath = yield* getBiomePath(projectDir);
  yield* generateProjectTypes({
    biomePath,
    chosenRecordingsTree,
    directoryStructure,
    projectDir,
  });

  return {
    chosenRecordings: renderChosenRecordingsType(chosenRecordingsTree),
    directoryStructure,
    paramNames: extractParameterNames(projectPath),
    projectPath,
  };
});

/**
 * Apply one filesystem notification to the cached project tree. File changes
 * update a single entry. A newly-created/replaced directory is crawled only
 * below that directory; removals are reconciled against the current filesystem
 * state so delete-create rename pairs converge regardless of event timing.
 */
const updateDirectoryStructure = Effect.fnUntraced(function* (
  cache: Cache.Cache<
    AbsoluteDir,
    DirectoryStructure,
    PlatformError.PlatformError,
    FileSystem.FileSystem
  >,
  event: AssetWatchEvent,
) {
  const relative = path.relative(event.projectDir, event.filename);
  if (!relative || relative === "." || relative.startsWith(`..${path.sep}`)) {
    return;
  }

  const basename = RelativeFile(path.basename(relative));
  const relativePath = RelativeDir(relative);
  if (shouldExclude(relativePath, basename)) return;

  const fs = yield* FileSystem.FileSystem;
  const current = yield* Cache.get(cache, event.projectDir);
  const info = yield* fs.stat(event.filename).pipe(Effect.option);
  let next: DirectoryStructure;

  if (Option.isNone(info)) {
    next = setDirectoryEntry(current, relative.split(path.sep), undefined);
  } else if (info.value.type === "Directory") {
    const parts = relative.split(path.sep);
    const existing = getDirectoryEntry(current, parts);

    if (
      event.event._tag === "Update" &&
      existing !== undefined &&
      existing !== null
    ) {
      return;
    }

    const subtree = yield* listProjectDir(
      event.projectDir,
      AbsoluteDir(event.filename),
      relativePath,
    );
    next = setDirectoryEntry(current, parts, subtree);
  } else {
    next = setDirectoryEntry(current, relative.split(path.sep), null);
  }

  yield* Cache.set(cache, event.projectDir, next);
});

function getDirectoryEntry(
  directory: DirectoryStructure,
  parts: readonly string[],
): DirectoryStructure | null | undefined {
  const [head, ...tail] = parts;
  if (head === undefined || !(head in directory)) return undefined;
  const entry = directory[head];
  if (tail.length === 0) return entry;
  if (entry === null || entry === undefined) return undefined;
  return getDirectoryEntry(entry, tail);
}

function setDirectoryEntry(
  directory: DirectoryStructure,
  parts: readonly string[],
  value: DirectoryStructure | null | undefined,
): DirectoryStructure {
  const [head, ...tail] = parts;
  if (head === undefined) return directory;

  const next = { ...directory };
  if (tail.length === 0) {
    if (value === undefined) delete next[head];
    else next[head] = value;
    return next;
  }

  const child = directory[head];
  if (value === undefined && child === undefined) return directory;
  const childDirectory = child !== null && child !== undefined ? child : {};
  next[head] = setDirectoryEntry(childDirectory, tail, value);
  return next;
}

function isChosenRecordingsInput(event: AssetWatchEvent): boolean {
  const relative = path.relative(event.projectDir, event.filename);
  const basename = path.basename(relative);
  const parts = relative.split(path.sep);
  const recordingsIndex = parts.indexOf(RECORDINGS_DIR);

  return (
    basename === PROJECT_FILE ||
    basename === PROJECT_META_FILE ||
    basename === RECORDING_META_FILE ||
    (recordingsIndex >= 0 &&
      parts.length === recordingsIndex + 2 &&
      (event.event._tag === "Create" || event.event._tag === "Remove"))
  );
}

/**
 * Generate a file from a Handlebars template, and format the result with Biome (if available).
 */
export const runTemplate = Effect.fnUntraced(
  function* ({
    biomePath,
    data,
    out,
    template,
  }: {
    /** Path to the Biome executable. */
    biomePath: Option.Option<AbsoluteFile>;

    /** Data to pass to the template */
    data: unknown;

    /** Path to the output file */
    out: AbsoluteFile;

    /** Path to the template file */
    template: RelativeFile;
  }) {
    const fs = yield* FileSystem.FileSystem;

    const { cwd } = getServerState();

    const templateHbs = yield* fs.readFileString(
      path.join(TEMPLATES_DIR, template),
      "utf8",
    );

    const templateFn = yield* Effect.try(() => Handlebars.compile(templateHbs));
    const result = templateFn(data);

    yield* fs.writeFileString(out, result);

    // invoke biome
    if (Option.isSome(biomePath)) {
      yield* Effect.promise(() =>
        execa(biomePath.value, ["check", "--fix", out], { cwd }),
      );
    }
  },
  (effect, { data, out, template }) =>
    effect.pipe(
      Effect.annotateLogs({ data, out, template }),
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
    ),
);

/**
 * List a project directory, applying include/exclude patterns.
 * @param projectDir - The root project directory
 * @param currentDir - The current directory being listed (defaults to projectDir)
 * @param relativePath - The path relative to projectDir (defaults to "")
 */
const listProjectDir = Effect.fnUntraced(function* (
  projectDir: AbsoluteDir,
  currentDir: AbsoluteDir = projectDir,
  relativePath: RelativeDir = RelativeDir(""),
): Effect.fn.Return<
  DirectoryStructure,
  PlatformError.PlatformError,
  FileSystem.FileSystem
> {
  const entries = yield* readDirWithFileTypes(currentDir);

  const results = yield* Effect.all(
    entries.map(([basename, kind]) => {
      return Effect.gen(function* () {
        switch (kind) {
          case "Directory": {
            const fullPath = path.join(currentDir, basename);
            const relPath = relativePath
              ? path.join(relativePath, basename)
              : basename;

            // Check if this entry should be excluded
            if (shouldExclude(relPath, basename)) {
              return null;
            }

            const subDir = yield* listProjectDir(projectDir, fullPath, relPath);

            return [basename, subDir] as const;
          }
          case "File": {
            const relPath = relativePath
              ? path.join(relativePath, basename)
              : basename;

            // Check if this entry should be excluded
            if (shouldExclude(relPath, basename)) {
              return null;
            }

            return [basename, null] as const;
          }
          default:
            return null;
        }
      });
    }),
  );

  return results.reduce((acc, entry) => {
    if (!entry) return acc;

    const [basename, value] = entry;

    acc[basename] = value;

    return acc;
  }, {} as DirectoryStructure);
});
