import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { loadJson, UP } from "@liqvid/cli/utils";
import { ProjectJson } from "@liqvid/schemas";
import {
  Cause,
  Effect,
  FileSystem,
  Logger,
  Option,
  type PlatformError,
  PubSub,
  References,
  Result,
  Stream,
} from "effect";
import {
  type AbsoluteDir,
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
  PROJECT_FILE,
  PROJECT_FILES_AUTOGEN,
  PROJECT_META_FILE,
  TYPES_AUTOGEN,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import type { Directory } from "../types/assets.mts";
import { readDirWithFileTypes } from "../utils/effect.mts";
import { getBiomePath } from "../utils/fs.mts";
import { cartesianProduct, getLogLevel, getRoutesDir } from "../utils/misc.mts";
import {
  buildParameterSubpath,
  ensureParamsMarker,
  extractParameterNames,
  getProjectParameterValues,
} from "../utils/parameters.mts";

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
  if (basename === PROJECT_META_FILE) return true;
  return false;
}

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  UP,
  UP,
  RelativeDir("templates"),
);

/**
 * Generate all combinations of parameter values.
 * e.g., `{ lang: ["en", "es"], locale: ["US", "CA"] }` →
 * `[{ lang: "en", locale: "US" }, { lang: "en", locale: "CA" }, { lang: "es", locale: "US" }, { lang: "es", locale: "CA" }]`
 */
function generateParameterCombinations(
  paramNames: string[],
  parameterValues: Record<string, readonly string[]>,
): Record<string, string>[] {
  if (paramNames.length === 0) {
    return [];
  }

  const combinations: Record<string, string>[] = [{}];

  for (const paramName of paramNames) {
    const values = parameterValues[paramName] ?? [];
    if (values.length === 0) {
      // No values for this parameter - can't generate combinations
      return [];
    }

    const newCombinations: Record<string, string>[] = [];
    for (const combo of combinations) {
      for (const value of values) {
        newCombinations.push({ ...combo, [paramName]: value });
      }
    }
    combinations.length = 0;
    combinations.push(...newCombinations);
  }

  return combinations;
}

/**
 * Initialize the parameterized directory structure for a project.
 * Creates directories like `.liqvid/en/US/`, `.liqvid/es/CA/`, etc.
 * for all parameter value combinations.
 */
function initializeParameterizedDirs(
  assetsDir: AbsoluteDir,
  projectPath: RelativeDir,
  projectParameters: Record<string, readonly string[]> | undefined,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const paramNames = extractParameterNames(projectPath);

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
  }).pipe(Effect.annotateLogs({ assetsDir, projectPath }));
}

/**
 * Check if a directory is a project directory.
 * A project directory contains both project.json and page.tsx.
 */
function isProjectDirectory(dir: AbsoluteDir) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const { hasPageTsx, hasProjectJson } = yield* Effect.all({
      hasPageTsx: fs.exists(path.join(dir, NEXT_PAGE)),
      hasProjectJson: fs.exists(path.join(dir, PROJECT_FILE)),
    });

    return hasProjectJson && hasPageTsx;
  });
}

/**
 * Find the project directory that contains the given file path.
 * Walks up the directory tree until it finds a project directory or reaches TARGET_DIR.
 */
function findProjectDirectory(filePath: AbsolutePath) {
  return Effect.gen(function* () {
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
}

export function watchAssets() {
  Handlebars.registerHelper("json", (obj) => {
    return new Handlebars.SafeString(JSON.stringify(obj, null, 2));
  });

  const TARGET_DIR = getRoutesDir();

  // A resolved asset change: the project directory whose types.ts should be
  // regenerated for this event.
  type WatchEvent = { projectDir: AbsoluteDir };

  // set up watch: a Pub/Sub fans watch events out to the consumer that
  // regenerates the affected project's types. The watcher lives for the
  // lifetime of the process.
  return Effect.gen(function* () {
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
                const biomePath = yield* Effect.promise(() =>
                  getBiomePath(projectDir),
                );
                yield* generateProjectTypes({ biomePath, projectDir });
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

    // Producer: pump fs.watch events into the Pub/Sub. This runs forever,
    // keeping the scope (and the forked consumer) alive.
    yield* watchAssetEvents(TARGET_DIR).pipe(
      Stream.runForEach((event) => PubSub.publish(pubsub, event)),
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.scoped);
}

/**
 * A stream of asset-relevant change events, backed by the platform's recursive
 * `FileSystem.watch`. Ignorable events (editor temp files, `.DS_Store`, etc.)
 * are dropped, and each remaining event is resolved to the project directory
 * containing it (dropping events that fall outside any project).
 */
function watchAssetEvents(
  targetDir: AbsoluteDir,
): Stream.Stream<{ projectDir: AbsoluteDir }, never, FileSystem.FileSystem> {
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

            return Result.succeed({ projectDir: $projectDir.value });
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
function generateProjectTypes({
  biomePath,
  projectDir,
}: {
  biomePath: Option.Option<AbsoluteFile>;
  projectDir: AbsoluteDir;
}) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    yield* Effect.logDebug(
      `generating ${PROJECT_FILES_AUTOGEN} and ${TYPES_AUTOGEN} `,
    );

    const directoryStructure = yield* listProjectDir(projectDir);
    const assetsDir = path.join(projectDir, ASSETS_DIR);

    // Read project.json to extract parameters
    const projectFile = path.join(projectDir, PROJECT_FILE);
    const project = yield* loadJson(ProjectJson, projectFile);

    // Use project parameters if defined, otherwise fall back to rootParameters from config
    let parametersRecord: Record<string, string[]>;
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

    yield* Effect.forkDetach(
      Effect.all([
        fs.writeFileString(
          path.join(assetsDir, PROJECT_FILES_AUTOGEN),
          JSON.stringify(directoryStructure, null, 2),
        ),
        runTemplate({
          biomePath,
          data: { parameters },
          out: path.join(assetsDir, TYPES_AUTOGEN),
          template: RelativeFile(`${TYPES_AUTOGEN}.hbs`),
        }),
      ]).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provideService(References.MinimumLogLevel, getLogLevel()),
        Effect.provide(Logger.layer([Logger.consolePretty()])),
      ),
    );
  }).pipe(Effect.annotateLogs({ projectDir }));
}

/**
 * Generate a file from a Handlebars template, and format the result with Biome (if available).
 */
export function runTemplate({
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
  return Effect.gen(function* () {
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
  }).pipe(
    Effect.annotateLogs({ data, out, template }),
    Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
  );
}

/**
 * List a project directory, applying include/exclude patterns.
 * @param projectDir - The root project directory
 * @param currentDir - The current directory being listed (defaults to projectDir)
 * @param relativePath - The path relative to projectDir (defaults to "")
 */
function listProjectDir(
  projectDir: AbsoluteDir,
  currentDir: AbsoluteDir = projectDir,
  relativePath: RelativeDir = RelativeDir(""),
): Effect.Effect<
  Directory,
  PlatformError.PlatformError,
  FileSystem.FileSystem
> {
  return Effect.gen(function* () {
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

              const subDir = yield* listProjectDir(
                projectDir,
                fullPath,
                relPath,
              );

              // Only include non-empty directories
              if (Object.keys(subDir).length > 0) {
                return [basename, subDir] as const;
              }
              return null;
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
    }, {} as Directory);
  });
}
