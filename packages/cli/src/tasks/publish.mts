import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { EnvFiles, type LiqvidConfig } from "@liqvid/schemas";
import { Cause, Effect, FileSystem, Option, References } from "effect";
import { type AbsoluteDir, type AbsoluteFile, RelativeDir } from "effect-paths";
import fg from "fast-glob";
import pluralize from "pluralize";
import type { CommandModule } from "yargs";

import { CopyProvider } from "#_/providers/hosting/copy.mjs";
import { LiqvidStudioProvider } from "#_/providers/hosting/liqvid-studio.mjs";
import { S3Provider } from "#_/providers/hosting/s3.mjs";
import { SFTPProvider } from "#_/providers/hosting/sftp.mjs";
import type {
  HostingProvider,
  MediaHostingProvider,
} from "#_/providers/types.mjs";
import {
  loadEnvFiles,
  loadLiqvidConfig,
  resolveConfigPath,
} from "#_/utils/effect.mjs";
import { getLogLevel } from "#_/utils/misc.mjs";

import {
  CONFIG_FILE,
  CONFIG_FILE_JSONC,
  DEFAULT_MEDIA_PATTERNS,
} from "./conventions.mts";

export type PublishOptions = {
  /** Base directory containing media files (relative to cwd). Defaults to "app". */
  baseDir?: RelativeDir;

  /** Path to liqvid.json config file */
  configPath?: AbsoluteFile;

  /** Working directory. Defaults to `process.cwd()`. */
  cwd?: AbsoluteDir;

  /** Show what would be uploaded without actually uploading */
  dryRun?: boolean;
};

/** Publish content and/or media files to configured hosting providers. */
export const publish: CommandModule<
  Record<string, never>,
  Required<Omit<PublishOptions, "configPath">> & { config?: AbsoluteFile }
> = {
  // @ts-expect-error TODO: figure this out
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
        coerce: path.resolve,
        default: process.cwd(),
        desc: "Working directory containing liqvid.jsonc or liqvid.json and media files",
        normalize: true,
      })
      .option("config", {
        alias: "c",
        coerce: path.resolve,
        desc: `Path to config file (default: ${CONFIG_FILE_JSONC} or ${CONFIG_FILE} in cwd)`,
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
    const cwd = argv.cwd;
    const baseDir = argv.baseDir;
    const dryRun = argv.dryRun;
    const contentFlag = argv.content;
    const mediaFlag = argv.media;

    // Resolve config path: use explicit --config if provided, otherwise find liqvid.jsonc or liqvid.json
    const configPath =
      argv.config ??
      (await Effect.runPromise(
        resolveConfigPath({ cwd }).pipe(Effect.provide(NodeFileSystem.layer)),
      ));

    // If neither --content nor --media is specified, publish both
    const shouldPublishContent = contentFlag || (!contentFlag && !mediaFlag);
    const shouldPublishMedia = mediaFlag || (!contentFlag && !mediaFlag);

    // Publish content if requested
    if (shouldPublishContent) {
      await publishContent({ baseDir, configPath, cwd, dryRun });
    }

    // Publish media if requested
    if (shouldPublishMedia) {
      await publishMedia({ baseDir, configPath, cwd, dryRun });
    }

    console.log("\nPublish complete!");
    process.exit(0);
  },
};

/**
 * Load the parsed Liqvid config for the given cwd/configPath.
 */
async function loadConfig(cwd: AbsoluteDir, configPath: AbsoluteFile) {
  const envFiles = loadEnvFiles(cwd);

  return Effect.runPromise(
    loadLiqvidConfig({ configPath }).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provideService(EnvFiles, envFiles),
    ),
  );
}

/**
 * Publish content files (html/css/js) to the configured hosting provider.
 *
 * Equivalent to `liqvid publish --content`.
 */
export async function publishContent(
  options: PublishOptions = {},
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? path.join(cwd, CONFIG_FILE);
  const dryRun = options.dryRun ?? false;

  const config = await loadConfig(cwd, configPath);

  await Effect.runPromise(
    publishContentFiles(config, cwd, dryRun).pipe(
      Effect.provide(NodeFileSystem.layer),
    ),
  );
}

/**
 * Publish media files to the configured media hosting provider.
 *
 * Equivalent to `liqvid publish --media`.
 */
export async function publishMedia(options: PublishOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? RelativeDir("app");
  const configPath = options.configPath ?? path.join(cwd, CONFIG_FILE);
  const dryRun = options.dryRun ?? false;

  // The base directory is where we search for media files
  // and paths are computed relative to it
  const searchDir = path.join(cwd, baseDir);

  const config = await loadConfig(cwd, configPath);

  await Effect.runPromise(
    publishMediaFiles(config, searchDir, baseDir, dryRun).pipe(
      Effect.provideService(
        References.MinimumLogLevel,
        getLogLevel(Option.some(config)),
      ),
      Effect.provide(NodeFileSystem.layer),
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
      Effect.catch(Effect.die),
    ),
  );
}

/**
 * Publish content files (html/css/js) to the hosting provider.
 */
function publishContentFiles(
  config: LiqvidConfig,
  cwd: AbsoluteDir,
  dryRun: boolean,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Next.js builds to the 'out' directory by default for static export
    const outDir = path.join(cwd, RelativeDir("out"));

    // Check if the out directory exists
    if (!(yield* fs.exists(outDir))) {
      return yield* Effect.die(
        new Error(
          "No 'out' directory found. Run 'next build' with static export first.",
        ),
      );
    }

    yield* Effect.log("Publishing content files...");

    const hostingProvider = createHostingProvider(config);

    if (dryRun) {
      yield* Effect.log(`Dry run: would publish content from ${outDir}`);
      return;
    }

    yield* Effect.promise(() => hostingProvider.publishContent(outDir));
    yield* Effect.log("Content publishing complete.");
  }).pipe(Effect.annotateLogs({ cwd, dryRun }));
}

/**
 * Publish media files to the media hosting provider.
 */
function publishMediaFiles(
  config: LiqvidConfig,
  searchDir: AbsoluteDir,
  baseDir: RelativeDir,
  dryRun: boolean,
) {
  return Effect.gen(function* () {
    // Get glob patterns from config, with sensible defaults
    const patterns =
      config.publishing?.include?.media ?? DEFAULT_MEDIA_PATTERNS;

    // Find media files matching the glob patterns
    const mediaFiles = yield* Effect.promise(
      () =>
        fg(patterns as string[], {
          absolute: true,
          cwd: searchDir,
          dot: true, // Include files in .liqvid directories
          onlyFiles: true,
        }) as Promise<AbsoluteFile[]>,
    );

    if (mediaFiles.length === 0) {
      yield* Effect.log(
        `No media files found in ${baseDir}/. Nothing to publish.`,
      );
      return;
    }

    // Sort for consistent output
    mediaFiles.sort();

    yield* Effect.log(
      `Found ${mediaFiles.length} media ${pluralize("file", mediaFiles.length)} in ${baseDir}/\n`,
    );

    // Create provider based on config
    const provider = createMediaProvider(config);

    if (dryRun) {
      yield* Effect.log("Dry run mode - checking remote state...\n");
      yield* showDryRunInfo(provider, mediaFiles, searchDir, config);
      return;
    }

    // Publish all media files (paths relative to searchDir)
    yield* provider.publishMedia(mediaFiles, searchDir);
    yield* Effect.log("Media publishing complete.");
  });
}

/**
 * Create the appropriate media provider based on config
 */
function createMediaProvider(config: LiqvidConfig): MediaHostingProvider {
  const mediaBackend = config.backend?.media;
  if (!mediaBackend) {
    throw new Error(
      `No media backend configured. Please set \`backend.media\` in ${CONFIG_FILE_JSONC} or ${CONFIG_FILE}`,
    );
  }

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
function createHostingProvider(config: LiqvidConfig): HostingProvider {
  const contentBackend = config.backend?.content;

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
function showDryRunInfo(
  provider: MediaHostingProvider,
  mediaFiles: AbsoluteFile[],
  rootDir: AbsoluteDir,
  _config: LiqvidConfig,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Check which files need to be uploaded
    const statuses = yield* provider.checkFiles(mediaFiles, rootDir);

    const toUpload = statuses.filter((s) => s.needsUpload);
    const unchanged = statuses.filter((s) => !s.needsUpload);

    if (toUpload.length > 0) {
      yield* Effect.log("Files that would be uploaded:\n");
      for (const { filePath, key, reason } of toUpload) {
        const stats = yield* fs.stat(filePath);
        const sizeStr = formatFileSize(stats.size);
        const reasonStr = reason === "new" ? "(new)" : "(modified)";
        yield* Effect.log(
          `  ${path.relative(rootDir, filePath)} → ${key} (${sizeStr}) ${reasonStr}`,
        );
      }
      yield* Effect.log();
    }

    if (unchanged.length > 0) {
      yield* Effect.log(
        `Unchanged: ${unchanged.length} ${pluralize("file", unchanged.length)}`,
      );
    }

    yield* Effect.log(
      `\nSummary: ${toUpload.length} to upload, ${unchanged.length} unchanged`,
    );
  });
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: bigint): string {
  const kibi = 1024n;

  if (bytes < kibi) return `${bytes} B`;
  if (bytes < kibi * kibi) return `${bytes / kibi} KB`;
  if (bytes < kibi * kibi * kibi) return `${bytes / (kibi * kibi)} MB`;
  return `${bytes / (kibi * kibi * kibi)} GB`;
}
