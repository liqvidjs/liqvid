import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { Err, Ok, type Result } from "@liqvid/fp";
import chalk from "chalk";
import type { AbsoluteDir, AbsoluteFile, RelativeDir } from "effect-paths";
import fg from "fast-glob";
import type { CommandModule } from "yargs";

import { DEFAULT_CONFIG, parseConfigWithTransform } from "./config.mts";
import {
  DEFAULT_MEDIA_BASE_DIR,
  DEFAULT_MEDIA_PATTERNS,
} from "./conventions.mts";

/** Options for the compress command */
export type CompressOptions = {
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
};

/** Result for a single file compression */
export type FileCompressionResult = {
  /** Path to the file */
  filePath: AbsoluteFile;

  /** Original file size in bytes */
  originalSize: number;

  /** Compressed file size in bytes */
  compressedSize: number;

  /** Percentage saved (0-100) */
  percentageSaved: number;
};

/** Overall compression report */
export type CompressionReport = {
  /** Results for each file */
  files: FileCompressionResult[];

  /** Total original size in bytes */
  totalOriginalSize: number;

  /** Total compressed size in bytes */
  totalCompressedSize: number;

  /** Overall percentage saved */
  overallPercentageSaved: number;

  /** Number of files processed */
  fileCount: number;
};

/** Error returned when compression fails */
export type CompressError = {
  /** Error messages */
  messages: string[];
};

/**
 * Find all PNG files in a directory recursively
 */
async function findPngFilesInDir(dir: AbsoluteDir): Promise<AbsoluteFile[]> {
  const pngFiles: AbsoluteFile[] = [];

  async function scanDir(currentDir: AbsoluteDir): Promise<void> {
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip node_modules and hidden directories
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          await scanDir(fullPath);
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
        const fullPath = path.join(currentDir, entry.name);

        pngFiles.push(fullPath);
      }
    }
  }

  await scanDir(dir);
  return pngFiles;
}

/**
 * Find PNG files using media glob patterns
 */
async function findPngFilesWithPatterns(
  baseDir: AbsoluteDir,
): Promise<AbsoluteFile[]> {
  // Filter patterns to only include PNG-related ones
  const pngPatterns = DEFAULT_MEDIA_PATTERNS.filter(
    (p) => p.includes("*.png") || p.startsWith("!"),
  );

  const files = (await fg(pngPatterns, {
    absolute: true,
    cwd: baseDir,
    dot: true,
    onlyFiles: true,
  })) as AbsoluteFile[];

  return files.filter((f) => f.toLowerCase().endsWith(".png"));
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
async function compressFile(
  filePath: AbsoluteFile,
  quality: number,
  compressionLevel: number,
  dryRun: boolean,
): Promise<Result<FileCompressionResult, string>> {
  try {
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

    return Ok({
      compressedSize:
        compressedSize < originalSize ? compressedSize : originalSize,
      filePath,
      originalSize,
      percentageSaved: Math.max(0, percentageSaved),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Err(`Failed to compress ${filePath}: ${message}`);
  }
}

/**
 * Process files in batches
 */
async function processBatch(
  files: AbsoluteFile[],
  quality: number,
  compressionLevel: number,
  batchSize: number,
  dryRun: boolean,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ results: FileCompressionResult[]; errors: string[] }> {
  const results: FileCompressionResult[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((file) =>
        compressFile(file, quality, compressionLevel, dryRun),
      ),
    );

    for (const result of batchResults) {
      if (result.isOk) {
        results.push(result.unwrap());
      } else {
        errors.push(result.unwrapErr());
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, files.length), files.length);
    }
  }

  return { errors, results };
}

/**
 * Run PNG compression on a directory
 */
export async function runCompress(
  options: CompressOptions,
): Promise<Result<CompressionReport, CompressError>> {
  const {
    baseDir = DEFAULT_MEDIA_BASE_DIR,
    batchSize = 5,
    compressionLevel = 9,
    dryRun = false,
    input,
    quality = 80,
  } = options;

  let pngFiles: AbsoluteFile[];
  // let displayPath: string;

  if (input) {
    // User specified a directory - scan it recursively
    if (!fs.existsSync(input)) {
      return Err({ messages: [`Input directory does not exist: ${input}`] });
    }

    const stats = await fsp.stat(input);
    if (!stats.isDirectory()) {
      return Err({ messages: [`Input is not a directory: ${input}`] });
    }

    // displayPath = input;
    console.log(chalk.blue(`Scanning for PNG files in ${input}...`));
    pngFiles = await findPngFilesInDir(input);
  } else {
    // No input specified - use media patterns in base directory
    const searchDir = path.join(process.cwd(), baseDir);

    if (!fs.existsSync(searchDir)) {
      return Err({
        messages: [
          `Base directory does not exist: ${searchDir}`,
          `Use --input to specify a directory, or ensure ${baseDir}/ exists.`,
        ],
      });
    }

    // displayPath = `${baseDir}/`;
    console.log(
      chalk.blue(
        `Scanning for PNG files in ${baseDir}/ using media patterns...`,
      ),
    );
    pngFiles = await findPngFilesWithPatterns(searchDir);
  }

  if (pngFiles.length === 0) {
    console.log(chalk.yellow("No PNG files found."));
    return Ok({
      fileCount: 0,
      files: [],
      overallPercentageSaved: 0,
      totalCompressedSize: 0,
      totalOriginalSize: 0,
    });
  }

  console.log(chalk.blue(`Found ${pngFiles.length} PNG files.`));
  if (dryRun) {
    console.log(chalk.yellow("Dry run mode - files will not be modified."));
  }
  console.log(chalk.blue(`Compressing in batches of ${batchSize}...\n`));

  // Process files
  const { errors, results } = await processBatch(
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

  const basePath = input ?? path.join(process.cwd(), baseDir);
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
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
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
    return Err({ messages: errors });
  }

  return Ok({
    fileCount: results.length,
    files: results,
    overallPercentageSaved,
    totalCompressedSize,
    totalOriginalSize,
  });
}

/**
 * Transform compress config from liqvid.json to CLI option names.
 */
function transformCompressConfig(
  config: Partial<CompressOptions>,
): Record<string, unknown> {
  return {
    "base-dir": config.baseDir,
    "batch-size": config.batchSize,
    "compression-level": config.compressionLevel,
    "dry-run": config.dryRun,
    input: config.input,
    quality: config.quality,
  };
}

export const compress: CommandModule = {
  builder: (yargs) =>
    yargs
      .config(
        "config",
        parseConfigWithTransform(["compress"], transformCompressConfig),
      )
      .default("config", DEFAULT_CONFIG)
      .example([
        ["liqvid compress", "Compress all media PNGs in app/"],
        ["liqvid compress --dry-run", "Preview compression savings"],
        ["liqvid compress -i ./public/images", "Compress PNGs in specific dir"],
        ["liqvid compress -q 60 -l 9", "Compress with custom quality"],
      ])
      .option("input", {
        alias: "i",
        desc: "Directory to scan for PNG files (if not specified, uses media patterns in base-dir)",
        normalize: true,
        type: "string",
      })
      .option("base-dir", {
        alias: "b",
        default: DEFAULT_MEDIA_BASE_DIR,
        desc: "Base directory for media file search when --input is not specified",
        normalize: true,
        type: "string",
      })
      .option("quality", {
        alias: "q",
        default: 80,
        desc: "PNG quality (0-100, lower = smaller file)",
        type: "number",
      })
      .option("compression-level", {
        alias: "l",
        default: 9,
        desc: "Compression level (0-9, higher = slower but smaller)",
        type: "number",
      })
      .option("batch-size", {
        alias: "B",
        default: 5,
        desc: "Number of files to process in parallel",
        type: "number",
      })
      .option("dry-run", {
        alias: "d",
        default: false,
        desc: "Report savings without modifying files",
        type: "boolean",
      })
      .check((argv) => {
        if (argv.quality < 0 || argv.quality > 100) {
          throw new Error("Quality must be between 0 and 100");
        }
        if (argv["compression-level"] < 0 || argv["compression-level"] > 9) {
          throw new Error("Compression level must be between 0 and 9");
        }
        if (argv["batch-size"] < 1) {
          throw new Error("Batch size must be at least 1");
        }
        return true;
      })
      .version(false),
  command: "compress",
  describe: "Compress PNG files in media directories",
  handler: async (argv) => {
    const result = await runCompress({
      baseDir: argv["base-dir"] as RelativeDir | undefined,
      batchSize: argv["batch-size"] as number,
      compressionLevel: argv["compression-level"] as number,
      dryRun: argv["dry-run"] as boolean,
      input: argv.input as AbsoluteDir | undefined,
      quality: argv.quality as number,
    });

    if (result.isErr) {
      console.error(chalk.red("\nCompression completed with errors."));
      process.exit(1);
    }

    process.exit(0);
  },
};
