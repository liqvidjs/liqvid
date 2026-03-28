import * as fsp from "node:fs/promises";
import * as path from "node:path";

import fg from "fast-glob";
import pluralize from "pluralize";
import type { CommandModule } from "yargs";

import { LiqvidConfig } from "@liqvid/schemas";

import { S3Provider } from "../providers/hosting/s3.mts";

const CONFIG_FILE = "liqvid.json";

/** Default glob patterns for media files (matches schema defaults) */
const DEFAULT_MEDIA_PATTERNS = [
  "**/*.gif",
  "**/*.jpeg",
  "**/*.jpg",
  "**/*.m3u8",
  "**/*.mov",
  "**/*.mp4",
  "**/*.png",
  "**/*.webm",
  // omit social share images handled by Next
  "!**/opengraph-image.*",
  "!**/twitter-image.*",
  // distinguish Transport Stream files from TypeScript files
  "**/.liqvid/**/*.ts",
  "!**/.liqvid/types.ts",
  "!**/*.d.ts",
  "!**/*.d.json.ts",
];

/** Publish media files to configured hosting provider. */
export const publish: CommandModule = {
  builder: (yargs) =>
    yargs
      .example([
        ["liqvid publish"],
        ["liqvid publish --cwd ./my-project"],
        ["liqvid publish --base-dir src"],
        ["liqvid publish --dry-run"],
      ])
      .group(["cwd", "config", "base-dir", "dry-run", "help"], "Options")
      .option("cwd", {
        alias: "C",
        default: process.cwd(),
        desc: "Working directory containing liqvid.json and media files",
        normalize: true,
      })
      .option("config", {
        alias: "c",
        desc: `Path to config file (default: ${CONFIG_FILE} in cwd)`,
        normalize: true,
      })
      .option("base-dir", {
        alias: "b",
        default: "app",
        desc: "Base directory containing media files (paths are relative to this)",
        normalize: true,
      })
      .option("dry-run", {
        alias: "n",
        default: false,
        desc: "Show what would be uploaded without actually uploading",
        type: "boolean",
      })
      .version(false),
  command: "publish",
  describe: "Publish media files to configured hosting provider",
  handler: async (argv) => {
    const cwd = argv.cwd as string;
    const baseDir = argv["base-dir"] as string;
    const dryRun = argv["dry-run"] as boolean;
    const configPath = (argv.config as string) ?? path.join(cwd, CONFIG_FILE);

    // The base directory is where we search for media files
    // and paths are computed relative to it
    const searchDir = path.join(cwd, baseDir);

    // Load and parse config
    const config = await loadConfig(configPath);

    // Get glob patterns from config, with sensible defaults
    const patterns = config.publishing?.include?.media ?? DEFAULT_MEDIA_PATTERNS;

    // Find media files matching the glob patterns
    const mediaFiles = await fg(patterns, {
      cwd: searchDir,
      absolute: true,
      onlyFiles: true,
      dot: true, // Include files in .liqvid directories
    });

    if (mediaFiles.length === 0) {
      console.log(`No media files found in ${baseDir}/. Nothing to publish.`);
      process.exit(0);
    }

    // Sort for consistent output
    mediaFiles.sort();

    console.log(
      `Found ${mediaFiles.length} media ${pluralize("file", mediaFiles.length)} in ${baseDir}/`,
    );
    console.log();

    // Create provider based on config
    const provider = createProvider(config);

    if (dryRun) {
      console.log("Dry run mode - checking remote state...\n");
      await showDryRunInfo(provider, mediaFiles, searchDir, config);
      process.exit(0);
    }

    // Publish all media files (paths relative to searchDir)
    await provider.publishMedia(mediaFiles, searchDir);

    console.log("\nPublish complete!");
    process.exit(0);
  },
};

/**
 * Load and validate the liqvid.json config file
 */
async function loadConfig(configPath: string): Promise<LiqvidConfig> {
  let rawConfig: unknown;

  try {
    const content = await fsp.readFile(configPath, "utf-8");
    rawConfig = JSON.parse(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`Config file not found: ${configPath}`);
      console.error(
        "\nCreate a liqvid.json file with your media hosting configuration.",
      );
      console.error("Example:\n");
      console.error(
        JSON.stringify(
          {
            $schema: "https://liqvidjs.org/schemas/liqvid-config.json",
            backend: {
              content: "s3",
              media: "s3",
            },
            providers: {
              s3: {
                auth: { profile: "default" },
                bucket: "my-bucket",
                prefix: "media",
                region: "us-east-1",
              },
            },
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    throw err;
  }

  const result = LiqvidConfig.safeParse(rawConfig);

  if (!result.success) {
    console.error("Invalid config file:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

/**
 * Create the appropriate provider based on config
 */
function createProvider(config: LiqvidConfig): S3Provider {
  const mediaBackend = config.backend.media;

  if (mediaBackend === "s3") {
    const s3Config = config.providers.s3;
    if (!s3Config) {
      throw new Error("S3 is configured as media backend but no S3 provider configuration found");
    }
    return new S3Provider(s3Config);
  }

  throw new Error(`Unsupported media provider: ${mediaBackend}. Currently only "s3" is supported.`);
}

/**
 * Show what would be uploaded in dry-run mode
 */
async function showDryRunInfo(
  provider: S3Provider,
  mediaFiles: string[],
  rootDir: string,
  config: LiqvidConfig,
): Promise<void> {
  const bucket = config.providers.s3?.bucket ?? "bucket";

  // Check which files need to be uploaded
  const statuses = await provider.checkFiles(mediaFiles, rootDir);

  const toUpload = statuses.filter((s) => s.needsUpload);
  const unchanged = statuses.filter((s) => !s.needsUpload);

  if (toUpload.length > 0) {
    console.log("Files that would be uploaded:\n");
    for (const { filePath, key, reason } of toUpload) {
      const stats = await fsp.stat(filePath);
      const sizeStr = formatFileSize(stats.size);
      const reasonStr = reason === "new" ? "(new)" : "(modified)";
      console.log(`  ${path.relative(rootDir, filePath)} → s3://${bucket}/${key} (${sizeStr}) ${reasonStr}`);
    }
    console.log();
  }

  if (unchanged.length > 0) {
    console.log(`Unchanged: ${unchanged.length} ${pluralize("file", unchanged.length)}`);
  }

  console.log(
    `\nSummary: ${toUpload.length} to upload, ${unchanged.length} unchanged`,
  );
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
