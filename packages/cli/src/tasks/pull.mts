import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { LiqvidConfig } from "@liqvid/schemas";
import pluralize from "pluralize";
import type { CommandModule } from "yargs";

import { S3Provider } from "../providers/hosting/s3.mts";
import type {
  FileDownloadStatus,
  RemoteFileInfo,
} from "../providers/types.mts";

import { CONFIG_FILE } from "./conventions.mts";

/** File extensions that are considered media files for downloading */
const MEDIA_EXTENSIONS = new Set([
  ".gif",
  ".jpeg",
  ".jpg",
  ".m3u8",
  ".mov",
  ".mp4",
  ".png",
  ".ts",
  ".webm",
]);

/**
 * Check if a remote file is a media file based on its extension.
 * Note: .ts is for HLS Transport Stream files, not TypeScript.
 * TypeScript files (.d.ts, .d.json.ts, types.ts) are explicitly excluded.
 */
function isMediaFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  const basename = path.basename(lowerPath);

  // Exclude TypeScript files
  if (
    lowerPath.endsWith(".d.ts") ||
    lowerPath.endsWith(".d.json.ts") ||
    basename === "types.ts"
  ) {
    return false;
  }

  const ext = path.extname(lowerPath);
  return MEDIA_EXTENSIONS.has(ext);
}

/** Pull media files from configured hosting provider. */
export const pull: CommandModule = {
  builder: (yargs) =>
    yargs
      .example([
        ["liqvid pull"],
        ["liqvid pull --cwd ./my-project"],
        ["liqvid pull --base-dir src"],
        ["liqvid pull --dry-run"],
      ])
      .group(["cwd", "config", "base-dir", "dry-run", "help"], "Options")
      .option("cwd", {
        alias: "C",
        default: process.cwd(),
        desc: "Working directory containing liqvid.json",
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
        desc: "Base directory where media files will be saved (paths are relative to this)",
        normalize: true,
      })
      .option("dry-run", {
        alias: "n",
        default: false,
        desc: "Show what would be downloaded without actually downloading",
        type: "boolean",
      })
      .version(false),
  command: "pull",
  describe: "Pull media files from configured hosting provider",
  handler: async (argv) => {
    const cwd = argv.cwd as string;
    const baseDir = argv["base-dir"] as string;
    const dryRun = argv["dry-run"] as boolean;
    const configPath = (argv.config as string) ?? path.join(cwd, CONFIG_FILE);

    // The base directory is where we save media files
    // and paths are computed relative to it
    const targetDir = path.join(cwd, baseDir);

    // Load and parse config
    const config = await loadConfig(configPath);

    // Create provider based on config
    const provider = createProvider(config);

    console.log(
      `Listing remote files from s3://${config.providers.s3?.bucket ?? "bucket"}...`,
    );

    // List all remote files
    const remoteFiles = await provider.listRemoteFiles();

    // Filter to only media files
    const mediaFiles = remoteFiles.filter((f) => isMediaFile(f.key));

    if (mediaFiles.length === 0) {
      console.log("No media files found on remote. Nothing to pull.");
      process.exit(0);
    }

    // Sort for consistent output
    mediaFiles.sort((a, b) => a.key.localeCompare(b.key));

    console.log(
      `Found ${mediaFiles.length} media ${pluralize("file", mediaFiles.length)} on remote`,
    );
    console.log();

    // Check which files need to be downloaded
    const statuses = await provider.checkRemoteFiles(mediaFiles, targetDir);

    if (dryRun) {
      console.log("Dry run mode - showing what would be downloaded...\n");
      await showDryRunInfo(statuses, targetDir, config, mediaFiles);
      process.exit(0);
    }

    // Download files (this never deletes local content)
    const downloadCount = await provider.downloadMedia(statuses);

    if (downloadCount > 0) {
      console.log("\nPull complete!");
    }
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
      throw new Error(
        "S3 is configured as media backend but no S3 provider configuration found",
      );
    }
    return new S3Provider(s3Config);
  }

  throw new Error(
    `Unsupported media provider: ${mediaBackend}. Currently only "s3" is supported.`,
  );
}

/**
 * Show what would be downloaded in dry-run mode
 */
async function showDryRunInfo(
  statuses: FileDownloadStatus[],
  targetDir: string,
  config: LiqvidConfig,
  remoteFiles: RemoteFileInfo[],
): Promise<void> {
  const bucket = config.providers.s3?.bucket ?? "bucket";

  // Build a map for quick lookup of remote file info
  const remoteFileMap = new Map<string, RemoteFileInfo>();
  for (const file of remoteFiles) {
    remoteFileMap.set(file.key, file);
  }

  const toDownload = statuses.filter((s) => s.needsDownload);
  const unchanged = statuses.filter((s) => !s.needsDownload);

  if (toDownload.length > 0) {
    console.log("Files that would be downloaded:\n");
    for (const { key, localPath, reason } of toDownload) {
      const remoteFile = remoteFileMap.get(key);
      const sizeStr = remoteFile ? formatFileSize(remoteFile.size) : "unknown";
      const reasonStr = reason === "new" ? "(new)" : "(modified)";
      console.log(
        `  s3://${bucket}/${config.providers.s3?.prefix ?? ""}/${key} → ${path.relative(targetDir, localPath)} (${sizeStr}) ${reasonStr}`,
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
    `\nSummary: ${toDownload.length} to download, ${unchanged.length} unchanged`,
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
