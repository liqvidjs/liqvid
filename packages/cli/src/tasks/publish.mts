import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { EnvFiles, type LiqvidConfig } from "@liqvid/schemas/effect";
import { Effect } from "effect";
import fg from "fast-glob";
import pluralize from "pluralize";
import type { CommandModule } from "yargs";

import { CopyProvider } from "../providers/hosting/copy.mts";
import { LiqvidStudioProvider } from "../providers/hosting/liqvid-studio.mts";
import { S3Provider } from "../providers/hosting/s3.mts";
import { SFTPProvider } from "../providers/hosting/sftp.mts";
import type {
  HostingProvider,
  MediaHostingProvider,
} from "../providers/types.mts";
import { loadEnvFiles, loadLiqvidConfig } from "../utils/effect.mts";

import { CONFIG_FILE, DEFAULT_MEDIA_PATTERNS } from "./conventions.mts";

/** Publish content and/or media files to configured hosting providers. */
export const publish: CommandModule = {
  builder: (yargs) =>
    yargs
      .example([
        ["liqvid publish"],
        ["liqvid publish --content"],
        ["liqvid publish --media"],
        ["liqvid publish --cwd ./my-project"],
        ["liqvid publish --base-dir src"],
        ["liqvid publish --dry-run"],
      ])
      .group(
        ["cwd", "config", "base-dir", "content", "media", "dry-run", "help"],
        "Options",
      )
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
      .option("content", {
        default: false,
        desc: "Publish content files (html/css/js) to the hosting provider",
        type: "boolean",
      })
      .option("media", {
        default: false,
        desc: "Publish media files to the media hosting provider",
        type: "boolean",
      })
      .option("dry-run", {
        alias: "n",
        default: false,
        desc: "Show what would be uploaded without actually uploading",
        type: "boolean",
      })
      .version(false),
  command: "publish",
  describe:
    "Publish content and/or media files to configured hosting providers",
  handler: async (argv) => {
    const cwd = argv.cwd as string;
    const baseDir = argv["base-dir"] as string;
    const dryRun = argv["dry-run"] as boolean;
    const publishContent = argv.content as boolean;
    const publishMedia = argv.media as boolean;
    const configPath = (argv.config as string) ?? path.join(cwd, CONFIG_FILE);

    // If neither --content nor --media is specified, publish both
    const shouldPublishContent =
      publishContent || (!publishContent && !publishMedia);
    const shouldPublishMedia =
      publishMedia || (!publishContent && !publishMedia);

    // The base directory is where we search for media files
    // and paths are computed relative to it
    const searchDir = path.join(cwd, baseDir);

    // Load and parse config
    const envFiles = loadEnvFiles(process.cwd());

    // Load config to get media base URL
    const config = await Effect.runPromise(
      loadLiqvidConfig({ configPath }).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provideService(EnvFiles, envFiles),
      ),
    );

    // Publish content if requested
    if (shouldPublishContent) {
      await publishContentFiles(config, cwd, dryRun);
    }

    // Publish media if requested
    if (shouldPublishMedia) {
      await publishMediaFiles(config, searchDir, baseDir, dryRun);
    }

    console.log("\nPublish complete!");
    process.exit(0);
  },
};

/**
 * Publish content files (html/css/js) to the hosting provider.
 */
async function publishContentFiles(
  config: LiqvidConfig,
  cwd: string,
  dryRun: boolean,
): Promise<void> {
  // Next.js builds to the 'out' directory by default for static export
  const outDir = path.join(cwd, "out");

  // Check if the out directory exists
  try {
    await fsp.access(outDir);
  } catch {
    console.log(
      "No 'out' directory found. Run 'next build' with static export first.",
    );
    return;
  }

  console.log("Publishing content files...");

  const hostingProvider = createHostingProvider(config);

  if (dryRun) {
    console.log(`Dry run: would publish content from ${outDir}`);
    return;
  }

  await hostingProvider.publishContent(outDir);
  console.log("Content publishing complete.");
}

/**
 * Publish media files to the media hosting provider.
 */
async function publishMediaFiles(
  config: LiqvidConfig,
  searchDir: string,
  baseDir: string,
  dryRun: boolean,
): Promise<void> {
  // Get glob patterns from config, with sensible defaults
  const patterns = config.publishing?.include?.media ?? DEFAULT_MEDIA_PATTERNS;

  // Find media files matching the glob patterns
  const mediaFiles = await fg(patterns, {
    absolute: true,
    cwd: searchDir,
    dot: true, // Include files in .liqvid directories
    onlyFiles: true,
  });

  if (mediaFiles.length === 0) {
    console.log(`No media files found in ${baseDir}/. Nothing to publish.`);
    return;
  }

  // Sort for consistent output
  mediaFiles.sort();

  console.log(
    `Found ${mediaFiles.length} media ${pluralize("file", mediaFiles.length)} in ${baseDir}/`,
  );
  console.log();

  // Create provider based on config
  const provider = createMediaProvider(config);

  if (dryRun) {
    console.log("Dry run mode - checking remote state...\n");
    await showDryRunInfo(provider, mediaFiles, searchDir, config);
    return;
  }

  // Publish all media files (paths relative to searchDir)
  await provider.publishMedia(mediaFiles, searchDir);
  console.log("Media publishing complete.");
}

/**
 * Create the appropriate media provider based on config
 */
function createMediaProvider(config: LiqvidConfig): MediaHostingProvider {
  const mediaBackend = config.backend.media;

  switch (mediaBackend) {
    case "copy": {
      const copyConfig = config.providers.copy;
      if (!copyConfig) {
        throw new Error(
          "copy is configured as media backend but no copy provider configuration found",
        );
      }
      return new CopyProvider(copyConfig);
    }
    case "liqvidStudio": {
      const liqvidStudioConfig = config.providers.liqvidStudio;
      if (!liqvidStudioConfig) {
        throw new Error(
          "liqvidStudio is configured as media backend but no liqvidStudio provider configuration found",
        );
      }
      return new LiqvidStudioProvider(liqvidStudioConfig);
    }
    case "s3": {
      const s3Config = config.providers.s3;
      if (!s3Config) {
        throw new Error(
          "S3 is configured as media backend but no S3 provider configuration found",
        );
      }
      return new S3Provider(s3Config);
    }
    case "sftp": {
      const sftpConfig = config.providers.sftp;
      if (!sftpConfig) {
        throw new Error(
          "sftp is configured as media backend but no sftp provider configuration found",
        );
      }
      return new SFTPProvider(sftpConfig);
    }
    default:
      throw new Error(`Unsupported media provider: ${mediaBackend}`);
  }
}

/**
 * Create the appropriate hosting provider based on config
 */
function createHostingProvider(config: LiqvidConfigOut): HostingProvider {
  const contentBackend = config.backend.content;

  switch (contentBackend) {
    case "copy": {
      const copyConfig = config.providers.copy;
      if (!copyConfig) {
        throw new Error(
          "copy is configured as content backend but no copy provider configuration found",
        );
      }
      return new CopyProvider(copyConfig);
    }
    case "githubPages": {
      throw new Error("GitHub Pages hosting provider is not yet implemented");
    }
    case "liqvidStudio": {
      const liqvidStudioConfig = config.providers.liqvidStudio;
      if (!liqvidStudioConfig) {
        throw new Error(
          "liqvidStudio is configured as content backend but no liqvidStudio provider configuration found",
        );
      }
      return new LiqvidStudioProvider(liqvidStudioConfig);
    }
    case "sftp": {
      const sftpConfig = config.providers.sftp;
      if (!sftpConfig) {
        throw new Error(
          "sftp is configured as content backend but no sftp provider configuration found",
        );
      }
      return new SFTPProvider(sftpConfig);
    }
    default:
      throw new Error(`Unsupported content provider: ${contentBackend}`);
  }
}

/**
 * Show what would be uploaded in dry-run mode
 */
async function showDryRunInfo(
  provider: MediaHostingProvider,
  mediaFiles: string[],
  rootDir: string,
  _config: LiqvidConfigOut,
): Promise<void> {
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
      console.log(
        `  ${path.relative(rootDir, filePath)} → ${key} (${sizeStr}) ${reasonStr}`,
      );
    }
    console.log();
  }

  if (unchanged.length > 0) {
    console.log(
      `Unchanged: ${unchanged.length} ${pluralize("file", unchanged.length)}`,
    );
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
