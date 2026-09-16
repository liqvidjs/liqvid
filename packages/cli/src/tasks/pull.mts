import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { EnvFiles, type LiqvidConfig } from "@liqvid/schemas";
import { Effect, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import type { AbsoluteDir, AbsoluteFile, RelativeDir } from "effect-paths";
import pluralize from "pluralize";

import { S3Provider } from "../providers/hosting/s3.mts";
import type {
  FileDownloadStatus,
  RemoteFileInfo,
} from "../providers/types.mts";
import {
  loadEnvFiles,
  loadLiqvidConfig,
  resolveConfigPath,
} from "../utils/effect.mts";

import { CONFIG_FILE, CONFIG_FILE_JSONC } from "./conventions.mts";

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
export const pull = Command.make(
  "pull",
  {
    baseDir: Flag.String("base-dir").pipe(
      Flag.withAlias("b"),
      Flag.withDescription(
        "Base directory where media files will be saved (paths are relative to this)",
      ),
      Flag.withDefault("app"),
    ),
    config: Flag.String("config").pipe(
      Flag.withAlias("c"),
      Flag.withDescription(
        `Path to config file (default: ${CONFIG_FILE_JSONC} or ${CONFIG_FILE} in cwd)`,
      ),
      Flag.optional,
    ),
    cwd: Flag.Directory("cwd").pipe(
      Flag.withAlias("C"),
      Flag.withDescription(
        "Working directory containing liqvid.jsonc or liqvid.json",
      ),
      Flag.withDefault(process.cwd()),
    ),
    dryRun: Flag.Boolean("dry-run").pipe(
      Flag.withAlias("n"),
      Flag.withDescription(
        "Show what would be downloaded without actually downloading",
      ),
      Flag.withDefault(false),
    ),
  },
  (argv) =>
    Effect.gen(function* () {
      const cwd = argv.cwd as AbsoluteDir;
      const baseDir = argv.baseDir as RelativeDir;
      const dryRun = argv.dryRun;

      // Resolve config path: use explicit --config if provided, otherwise find liqvid.jsonc or liqvid.json
      const configPath =
        (Option.getOrUndefined(argv.config) as AbsoluteFile | undefined) ??
        (yield* resolveConfigPath({ cwd }).pipe(
          Effect.provide(NodeFileSystem.layer),
        ));

      // The base directory is where we save media files
      // and paths are computed relative to it
      const targetDir = path.join(cwd, baseDir);

      // Load and parse config
      const config = yield* Effect.promise(() => loadConfig(configPath));

      // Create provider based on config
      const provider = createProvider(config);

      console.log(
        `Listing remote files from s3://${config.providers.s3?.bucket ?? "bucket"}...`,
      );

      // List all remote files
      const remoteFiles = yield* Effect.promise(() =>
        provider.listRemoteFiles(),
      );

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
      const statuses = yield* provider
        .checkRemoteFiles(mediaFiles, targetDir)
        .pipe(Effect.provide(NodeFileSystem.layer));

      if (dryRun) {
        console.log("Dry run mode - showing what would be downloaded...\n");
        showDryRunInfo(statuses, targetDir, config, mediaFiles);
        process.exit(0);
      }

      // Download files (this never deletes local content)
      const downloadCount = yield* provider.downloadMedia(statuses);

      if (downloadCount > 0) {
        console.log("\nPull complete!");
      }
      process.exit(0);
    }),
).pipe(
  Command.withDescription("Pull media files from configured hosting provider"),
);

/**
 * Load and validate the liqvid.json config file
 */
async function loadConfig(configPath: AbsoluteFile): Promise<LiqvidConfig> {
  const cwd = path.dirname(configPath);
  const envFiles = loadEnvFiles(cwd);

  try {
    return await Effect.runPromise(
      loadLiqvidConfig({ configPath }).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provideService(EnvFiles, envFiles),
      ),
    );
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);

    if (cause.includes("ENOENT") || cause.includes("NotFound")) {
      console.error(`Config file not found: ${configPath}`);
      console.error(
        `\nCreate a ${CONFIG_FILE_JSONC} or ${CONFIG_FILE} file with your media hosting configuration.`,
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

    console.error("Invalid config file:");
    console.error(cause);
    process.exit(1);
  }
}

/**
 * Create the appropriate provider based on config
 */
function createProvider(config: LiqvidConfig): S3Provider {
  const mediaBackend = config.backend?.media;

  if (!mediaBackend) {
    throw new Error(
      `No media backend configured. Please specify a media backend in your ${CONFIG_FILE_JSONC} or ${CONFIG_FILE} config file.`,
    );
  }

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
function showDryRunInfo(
  statuses: FileDownloadStatus[],
  targetDir: string,
  config: LiqvidConfig,
  remoteFiles: RemoteFileInfo[],
) {
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
