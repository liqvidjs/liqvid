import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { UP } from "@liqvid/cli/utils";
import { assertType } from "@liqvid/utils";
import chalk from "chalk";
import {
  Cause,
  Effect,
  FileSystem,
  Layer,
  Logger,
  Option,
  PubSub,
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
  NEXT_PAGE,
  PROJECT_FILE,
  PROJECT_META_FILE,
  TYPES_AUTOGEN,
} from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import type { Directory } from "../types/assets.mts";
import { getBiomePath } from "../utils/fs.mts";
import { getRoutesDir } from "../utils/misc.mts";

/**
 * Files/patterns to exclude from the directory listing (relative to project dir).
 * Code files, config files, and generated images are excluded.
 */
const EXCLUDE_PATTERNS = [
  "project.json",
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
  // Always exclude these
  if (basename === ".DS_Store") return true;
  if (basename === TYPES_AUTOGEN) return true;

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
  if (basename === ".DS_Store") return true;
  if (basename === TYPES_AUTOGEN) return true;
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

export async function watchAssets() {
  Handlebars.registerHelper("json", (obj) => {
    return new Handlebars.SafeString(JSON.stringify(obj, null, 2));
  });

  const TARGET_DIR = getRoutesDir();

  // A resolved asset change: the project directory whose types.ts should be
  // regenerated for this event.
  type WatchEvent = { projectDir: AbsoluteDir };

  // set up watch: a Pub/Sub fans watch events out to the consumer that
  // regenerates the affected project's types. The watcher lives for the
  // lifetime of the process, so we run it in a detached root fiber and return
  // once it has been started.
  Effect.runFork(
    Effect.gen(function* () {
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
                Effect.promise(async () => {
                  const biomePath = await getBiomePath(projectDir);
                  await generateProjectTypes({ biomePath, projectDir });
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

      return fs.watch(targetDir).pipe(
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
async function generateProjectTypes({
  biomePath,
  projectDir,
}: {
  biomePath: Option.Option<AbsoluteFile>;
  projectDir: AbsoluteDir;
}) {
  const directoryStructure = await listProjectDir(projectDir);
  const assetsDir = path.join(projectDir, ASSETS_DIR);

  // Ensure .liqvid directory exists
  await fsp.mkdir(assetsDir, { recursive: true });

  runTemplate({
    biomePath,
    data: {
      directoryStructure,
    },
    out: path.join(assetsDir, TYPES_AUTOGEN),
    template: RelativeFile(`${TYPES_AUTOGEN}.hbs`),
  });
}

/**
 * Generate a file from a Handlebars template, and format the result with Biome (if available).
 */
export async function runTemplate({
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
  const { cwd } = getServerState();

  const templateHbs = await fsp.readFile(
    path.join(TEMPLATES_DIR, template),
    "utf8",
  );

  try {
    const template = Handlebars.compile(templateHbs);
    const result = template(data);

    await fsp.writeFile(out, result);

    // invoke biome
    if (Option.isSome(biomePath)) {
      await execa(biomePath.value, ["check", "--fix", out], { cwd });
    }
  } catch (e) {
    console.error(chalk.red(JSON.stringify({ cwd })));
    console.error(e);
  }
}

/**
 * List a project directory, applying include/exclude patterns.
 * @param projectDir - The root project directory
 * @param currentDir - The current directory being listed (defaults to projectDir)
 * @param relativePath - The path relative to projectDir (defaults to "")
 */
async function listProjectDir(
  projectDir: AbsoluteDir,
  currentDir: AbsoluteDir = projectDir,
  relativePath: RelativeDir = RelativeDir(""),
): Promise<Directory> {
  const entries = await fsp.readdir(currentDir);

  const results = await Promise.all(
    entries.map(async (basename) => {
      const fullPath = path.join(currentDir, basename);
      const relPath = relativePath
        ? path.join(relativePath, basename)
        : basename;

      // Check if this entry should be excluded
      if (shouldExclude(relPath, basename)) {
        return null;
      }

      const stats = await fsp.stat(fullPath);
      if (stats.isDirectory()) {
        assertType<AbsoluteDir>(fullPath);
        assertType<RelativeDir>(relPath);

        const subDir = await listProjectDir(projectDir, fullPath, relPath);
        // Only include non-empty directories
        if (Object.keys(subDir).length > 0) {
          return [basename, subDir] as const;
        }
        return null;
      } else {
        return [basename, null] as const;
      }
    }),
  );

  return Object.fromEntries(
    results.filter(
      (entry): entry is [RelativePath, Directory | null] => entry !== null,
    ),
  );
}
