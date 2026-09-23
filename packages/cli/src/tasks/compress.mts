import * as fsp from "node:fs/promises";
import * as path from "node:path";

import chalk from "chalk";
import { Effect, Exit, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import type { AbsoluteDir, AbsoluteFile, RelativeDir } from "effect-paths";

import { fgEffect } from "#_/utils/fastglob.js";

import { agnosticFileSystem, readDirWithFileTypes } from "../utils.mts";

import {
  DEFAULT_MEDIA_BASE_DIR,
  DEFAULT_MEDIA_PATTERNS,
} from "./conventions.mts";

/** Options for the compress command */
export type CompressOptions = Readonly<{
  /** Directory to scan for PNG files (if not specified, uses media patterns) */
  input?: AbsoluteDir;

  /** Base directory for media file search (default: "app") */
  baseDir?: RelativeDir;

  /** Compression quality (0-100, lower = smaller file) */
  quality?: number;

  /** Compression level (0-9, higher = slower but smaller) */
  compressionLevel?: number;

  /** Number of files to process in parallel */
  batchSize?: number;

  /** Whether to run in dry-run mode (report only, no compression) */
  dryRun?: boolean;
}>;

/** Result for a single file compression */
export type FileCompressionResult = Readonly<{
  /** Path to the file */
  filePath: AbsoluteFile;

  /** Original file size in bytes */
  originalSize: number;

  /** Compressed file size in bytes */
  compressedSize: number;

  /** Percentage saved (0-100) */
  percentageSaved: number;
}>;

/** Overall compression report */
export type CompressionReport = Readonly<{
  /** Results for each file */
  files: readonly FileCompressionResult[];

  /** Total original size in bytes */
  totalOriginalSize: number;

  /** Total compressed size in bytes */
  totalCompressedSize: number;

  /** Overall percentage saved */
  overallPercentageSaved: number;

  /** Number of files processed */
  fileCount: number;
}>;

/** Error returned when compression fails */
export type CompressError = Readonly<{
  /** Error messages */
  messages: readonly string[];
}>;

/**
 * Find all PNG files in a directory recursively
 */
function findPngFilesInDir(dir: AbsoluteDir) {
  return Effect.gen(function* () {
    const pngFiles: AbsoluteFile[] = [];

    function scanDir(currentDir: AbsoluteDir): Effect.Effect<void, unknown> {
      return Effect.gen(function* () {
        const entries = yield* readDirWithFileTypes(currentDir).pipe(
          Effect.provide(agnosticFileSystem),
        );

        for (const entry of entries) {
          const [name, kind] = entry;
          if (kind === "Directory") {
            const fullPath = path.join(currentDir, name);

            // Skip node_modules and hidden directories
            if (!name.startsWith(".") && name !== "node_modules") {
              yield* scanDir(fullPath);
            }
          } else if (kind === "File" && name.toLowerCase().endsWith(".png")) {
            pngFiles.push(path.join(currentDir, name));
          }
        }
      });
    }

    yield* scanDir(dir);
    return pngFiles;
  });
}

/**
 * Find PNG files using media glob patterns
 */
function findPngFilesWithPatterns(baseDir: AbsoluteDir) {
  return Effect.gen(function* () {
    // Filter patterns to only include PNG-related ones
    const pngPatterns = DEFAULT_MEDIA_PATTERNS.filter(
      (p) => p.includes("*.png") || p.startsWith("!"),
    );

    const files = yield* fgEffect(pngPatterns, {
      absolute: true,
      cwd: baseDir,
      dot: true,
      onlyFiles: true,
    });

    return files.filter((f) => f.toLowerCase().endsWith(".png"));
  });
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Compress a single PNG file
 */
function compressFile(
  filePath: AbsoluteFile,
  quality: number,
  compressionLevel: number,
  dryRun: boolean,
): Effect.Effect<FileCompressionResult, string> {
  return Effect.tryPromise({
    catch: (e) => {
      const message = e instanceof Error ? e.message : String(e);
      return `Failed to compress ${filePath}: ${message}`;
    },
    try: async () => {
      const sharp = (await import("sharp")).default;

      const originalStats = await fsp.stat(filePath);
      const originalSize = originalStats.size;

      // Read and compress the image
      const inputBuffer = await fsp.readFile(filePath);
      const compressedBuffer = await sharp(inputBuffer)
        .png({
          compressionLevel,
          quality,
        })
        .toBuffer();

      const compressedSize = compressedBuffer.length;

      // Only write if compressed is smaller and not in dry-run mode
      if (!dryRun && compressedSize < originalSize) {
        await fsp.writeFile(filePath, compressedBuffer);
      }

      const percentageSaved =
        originalSize > 0
          ? ((originalSize - compressedSize) / originalSize) * 100
          : 0;

      return {
        compressedSize:
          compressedSize < originalSize ? compressedSize : originalSize,
        filePath,
        originalSize,
        percentageSaved: Math.max(0, percentageSaved),
      };
    },
  });
}

/**
 * Process files in batches
 */
function processBatch(
  files: readonly AbsoluteFile[],
  quality: number,
  compressionLevel: number,
  batchSize: number,
  dryRun: boolean,
  onProgress?: (completed: number, total: number) => void,
) {
  return Effect.gen(function* () {
    const results: FileCompressionResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = yield* Effect.all(
        batch.map((file) =>
          compressFile(file, quality, compressionLevel, dryRun).pipe(
            Effect.match({
              onFailure: (error) => ({ error }),
              onSuccess: (result) => ({ result }),
            }),
          ),
        ),
        { concurrency: "unbounded" },
      );

      for (const result of batchResults) {
        if ("result" in result) results.push(result.result);
        else errors.push(result.error);
      }

      onProgress?.(Math.min(i + batchSize, files.length), files.length);
    }

    return {
      errors: errors,
      results: results,
    };
  });
}

/**
 * Run PNG compression on a directory
 */
export function runCompress(
  options: CompressOptions,
): Effect.Effect<CompressionReport, CompressError> {
  return Effect.gen(function* () {
    const {
      baseDir = DEFAULT_MEDIA_BASE_DIR,
      batchSize = 5,
      compressionLevel = 9,
      dryRun = false,
      input,
      quality = 80,
    } = options;

    let pngFiles: readonly AbsoluteFile[];
    let basePath: AbsoluteDir;

    if (input) {
      const stats = yield* Effect.tryPromise({
        catch: (error) => error,
        try: () => fsp.stat(input),
      }).pipe(Effect.catch(() => Effect.void));
      if (!stats) {
        return yield* Effect.fail({
          messages: [`Input directory does not exist: ${input}`],
        });
      }
      if (!stats.isDirectory()) {
        return yield* Effect.fail({
          messages: [`Input is not a directory: ${input}`],
        });
      }

      basePath = input;
      console.log(chalk.blue(`Scanning for PNG files in ${input}...`));
      pngFiles = yield* findPngFilesInDir(input).pipe(
        Effect.mapError((error) => ({ messages: [String(error)] })),
      );
    } else {
      const searchDir = path.join(process.cwd(), baseDir);
      const stats = yield* Effect.tryPromise({
        catch: (error) => error,
        try: () => fsp.stat(searchDir),
      }).pipe(Effect.catch(() => Effect.void));
      if (!stats) {
        return yield* Effect.fail({
          messages: [
            `Base directory does not exist: ${searchDir}`,
            `Use --input to specify a directory, or ensure ${baseDir}/ exists.`,
          ],
        });
      }

      basePath = searchDir;
      console.log(
        chalk.blue(
          `Scanning for PNG files in ${baseDir}/ using media patterns...`,
        ),
      );
      pngFiles = yield* findPngFilesWithPatterns(searchDir).pipe(
        Effect.mapError((error) => ({ messages: [String(error)] })),
      );
    }

    if (pngFiles.length === 0) {
      console.log(chalk.yellow("No PNG files found."));
      return {
        fileCount: 0,
        files: [],
        overallPercentageSaved: 0,
        totalCompressedSize: 0,
        totalOriginalSize: 0,
      };
    }

    console.log(chalk.blue(`Found ${pngFiles.length} PNG files.`));
    if (dryRun) {
      console.log(chalk.yellow("Dry run mode - files will not be modified."));
    }
    console.log(chalk.blue(`Compressing in batches of ${batchSize}...\n`));

    const { errors, results } = yield* processBatch(
      pngFiles,
      quality,
      compressionLevel,
      batchSize,
      dryRun,
      (completed, total) => {
        process.stdout.write(`\rProgress: ${completed}/${total} files`);
      },
    );

    console.log("\n");

    // Print individual file results
    console.log(chalk.bold("File Results:"));
    console.log("-".repeat(80));

    for (const result of results) {
      const relativePath = path.relative(basePath, result.filePath);
      const savedIndicator =
        result.percentageSaved > 0
          ? chalk.green(`-${result.percentageSaved.toFixed(1)}%`)
          : chalk.gray("0%");

      console.log(`${relativePath}`);
      console.log(
        `  ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${savedIndicator})`,
      );
    }

    // Print errors if any
    if (errors.length > 0) {
      console.log("\n" + chalk.red("Errors:"));
      for (const error of errors) {
        console.log(chalk.red(`  • ${error}`));
      }
    }

    // Calculate totals
    const totalOriginalSize = results.reduce(
      (sum, r) => sum + r.originalSize,
      0,
    );
    const totalCompressedSize = results.reduce(
      (sum, r) => sum + r.compressedSize,
      0,
    );
    const overallPercentageSaved =
      totalOriginalSize > 0
        ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
        : 0;

    // Print summary
    console.log("\n" + "-".repeat(80));
    console.log(chalk.bold("Summary:"));
    console.log(`  Files processed: ${results.length}`);
    console.log(`  Original size:   ${formatBytes(totalOriginalSize)}`);
    console.log(`  Compressed size: ${formatBytes(totalCompressedSize)}`);
    console.log(
      `  Total saved:     ${formatBytes(totalOriginalSize - totalCompressedSize)} (${chalk.green(`${overallPercentageSaved.toFixed(1)}%`)})`,
    );

    if (errors.length > 0) {
      return yield* Effect.fail({ messages: errors });
    }

    return {
      fileCount: results.length,
      files: results,
      overallPercentageSaved,
      totalCompressedSize,
      totalOriginalSize,
    };
  });
}

export const compress = Command.make(
  "compress",
  {
    baseDir: Flag.String("base-dir").pipe(
      Flag.withAlias("b"),
      Flag.withDescription(
        "Base directory for media file search when --input is not specified",
      ),
      Flag.withDefault(DEFAULT_MEDIA_BASE_DIR as string),
    ),
    batchSize: Flag.Int("batch-size").pipe(
      Flag.withAlias("B"),
      Flag.withDescription("Number of files to process in parallel"),
      Flag.withDefault(5),
    ),
    compressionLevel: Flag.Int("compression-level").pipe(
      Flag.withAlias("l"),
      Flag.withDescription(
        "Compression level (0-9, higher = slower but smaller)",
      ),
      Flag.withDefault(9),
    ),
    dryRun: Flag.Boolean("dry-run").pipe(
      Flag.withAlias("d"),
      Flag.withDescription("Report savings without modifying files"),
      Flag.withDefault(false),
    ),
    input: Flag.Directory("input").pipe(
      Flag.withAlias("i"),
      Flag.withDescription(
        "Directory to scan for PNG files (if not specified, uses media patterns in base-dir)",
      ),
      Flag.optional,
    ),
    quality: Flag.Int("quality").pipe(
      Flag.withAlias("q"),
      Flag.withDescription("PNG quality (0-100, lower = smaller file)"),
      Flag.withDefault(80),
    ),
  },
  ({ baseDir, batchSize, compressionLevel, dryRun, input, quality }) =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        runCompress({
          baseDir: baseDir as RelativeDir | undefined,
          batchSize,
          compressionLevel,
          dryRun,
          input: Option.getOrUndefined(input) as AbsoluteDir | undefined,
          quality,
        }),
      );

      if (Exit.isFailure(exit)) {
        console.error(chalk.red("\nCompression completed with errors."));
        process.exit(1);
      }

      process.exit(0);
    }),
).pipe(Command.withDescription("Compress PNG files in media directories"));
