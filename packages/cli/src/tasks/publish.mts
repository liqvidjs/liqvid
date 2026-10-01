import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { EnvFiles, type LiqvidConfig } from "@liqvid/schemas";
import { Effect, FileSystem, Layer, Logger, Option, References } from "effect";
import { Command, Flag } from "effect/cli";
import { type AbsoluteDir, type AbsoluteFile, RelativeDir } from "effect-paths";
import fg from "fast-glob";
import pluralize from "pluralize";

import { CopyProvider } from "#_/providers/hosting/copy";
import { GitHubPagesProvider } from "#_/providers/hosting/github-pages";
import { LiqvidStudioProvider } from "#_/providers/hosting/liqvid-studio";
import { S3Provider } from "#_/providers/hosting/s3";
import { SFTPProvider } from "#_/providers/hosting/sftp";
import type { HostingProvider, MediaHostingProvider } from "#_/providers/types";
import {
  loadEnvFiles,
  loadLiqvidConfig,
  resolveConfigPath,
} from "#_/utils/effect";
import { getLogLevel } from "#_/utils/misc";
import { defaultCliProgressLayer } from "#_/utils/progress.mjs";

import {
  CONFIG_FILE,
  CONFIG_FILE_JSONC,
  DEFAULT_MEDIA_PATTERNS,
} from "./conventions.mts";

export type PublishOptions = Readonly<{
  /** Base directory containing media files (relative to cwd). Defaults to "app". */
  baseDir?: RelativeDir;

  /** Path to liqvid.json config file */
  configPath?: AbsoluteFile;

  /** Working directory. Defaults to `process.cwd()`. */
  cwd?: AbsoluteDir;

  /** Show what would be uploaded without actually uploading */
  dryRun?: boolean;

  /** Upload files even when they are unchanged */
  force?: boolean;
}>;

/** Publish content and/or media files to configured hosting providers. */
export const publish = Command.make(
  "publish",
  {
    baseDir: Flag.String("base-dir").pipe(
      Flag.withAlias("b"),
      Flag.withDescription(
        "Base directory containing media files (paths are relative to this)",
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
    content: Flag.Boolean("content").pipe(
      Flag.withDescription(
        "Publish content files (html/css/js) to the hosting provider",
      ),
      Flag.withDefault(false),
    ),
    cwd: Flag.Directory("cwd").pipe(
      Flag.withAlias("C"),
      Flag.withDescription(
        "Working directory containing liqvid.jsonc or liqvid.json and media files",
      ),
      Flag.withDefault(process.cwd()),
    ),
    dryRun: Flag.Boolean("dry-run").pipe(
      Flag.withAlias("n"),
      Flag.withDescription(
        "Show what would be uploaded without actually uploading",
      ),
      Flag.withDefault(false),
    ),
    force: Flag.Boolean("force").pipe(
      Flag.withDescription("Upload files even when they are unchanged"),
      Flag.withDefault(false),
    ),
    media: Flag.Boolean("media").pipe(
      Flag.withDescription("Publish media files to the media hosting provider"),
      Flag.withDefault(false),
    ),
  },
  (argv) =>
    Effect.gen(function* () {
      const cwd = path.resolve(argv.cwd) as AbsoluteDir;
      const baseDir = argv.baseDir as RelativeDir;
      const dryRun = argv.dryRun;
      const force = argv.force;
      const contentFlag = argv.content;
      const mediaFlag = argv.media;

      // Resolve config path: use explicit --config if provided, otherwise find liqvid.jsonc or liqvid.json
      const configPath =
        (Option.getOrUndefined(argv.config) as AbsoluteFile | undefined) ??
        (yield* resolveConfigPath({ cwd }).pipe(
          Effect.provide(NodeFileSystem.layer),
        ));

      // If neither --content nor --media is specified, publish both
      const shouldPublishContent = contentFlag || (!contentFlag && !mediaFlag);
      const shouldPublishMedia = mediaFlag || (!contentFlag && !mediaFlag);

      // Publish content if requested
      if (shouldPublishContent) {
        yield* Effect.promise(() =>
          publishContent({ baseDir, configPath, cwd, dryRun, force }),
        );
      }

      // Publish media if requested
      if (shouldPublishMedia) {
        yield* publishMedia({ baseDir, configPath, cwd, dryRun, force }).pipe(
          Effect.provide(
            Layer.mergeAll(NodeFileSystem.layer, defaultCliProgressLayer()),
          ),
        );
      }

      yield* Effect.logInfo("\nPublish complete!");
      process.exit(0);
    }),
).pipe(
  Command.withDescription(
    "Publish content and/or media files to configured hosting providers",
  ),
);

/**
 * Load the parsed Liqvid config for the given cwd/configPath.
 */
const loadConfig = Effect.fnUntraced(function* (
  cwd: AbsoluteDir,
  configPath: AbsoluteFile,
) {
  const envFiles = loadEnvFiles(cwd);

  return yield* loadLiqvidConfig({ configPath }).pipe(
    Effect.provideService(EnvFiles, envFiles),
  );
});

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
  const force = options.force ?? false;

  const config = await Effect.runPromise(
    loadConfig(cwd, configPath).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  await Effect.runPromise(
    publishContentFiles(config, cwd, dryRun, force).pipe(
      Effect.provideService(
        References.MinimumLogLevel,
        getLogLevel(Option.some(config)),
      ),
      Effect.provide(
        Layer.mergeAll(
          Logger.layer([Logger.consolePretty({ colors: true })]),
          Layer.mergeAll(NodeFileSystem.layer, defaultCliProgressLayer()),
        ),
      ),
    ),
  );
}

/**
 * Publish media files to the configured media hosting provider.
 *
 * Equivalent to `liqvid publish --media`.
 */
export const publishMedia = Effect.fnUntraced(function* (
  options: PublishOptions = {},
) {
  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? RelativeDir("app");
  const configPath = options.configPath ?? path.join(cwd, CONFIG_FILE);
  const dryRun = options.dryRun ?? false;
  const force = options.force ?? false;

  // The base directory is where we search for media files
  // and paths are computed relative to it
  const searchDir = path.join(cwd, baseDir);

  const config = yield* loadConfig(cwd, configPath);

  yield* publishMediaFiles(config, searchDir, baseDir, dryRun, force).pipe(
    Effect.provideService(
      References.MinimumLogLevel,
      getLogLevel(Option.some(config)),
    ),
  );
});

/**
 * Publish content files (html/css/js) to the hosting provider.
 */
const publishContentFiles = Effect.fnUntraced(function* (
  config: LiqvidConfig,
  cwd: AbsoluteDir,
  dryRun: boolean,
  force: boolean,
) {
  const fs = yield* FileSystem.FileSystem;

  // Next.js builds to the 'out' directory by default for static export
  const outDir = path.join(cwd, RelativeDir("out"));
  const projectDir = path.join(cwd, RelativeDir("app"));

  // Check if the out directory exists
  if (!(yield* fs.exists(outDir))) {
    return yield* Effect.die(
      new Error(
        "No 'out' directory found. Run 'next build' with static export first.",
      ),
    );
  }

  yield* Effect.log("Publishing content files...", { outDir, projectDir });

  const hostingProvider = createHostingProvider(config);

  if (dryRun) {
    yield* Effect.log(`Dry run: would publish content from ${outDir}`);
    return;
  }

  yield* hostingProvider.publishContent(outDir, force, projectDir);
  yield* Effect.log("Content publishing complete.");
});

/**
 * Publish media files to the media hosting provider.
 */
const publishMediaFiles = Effect.fnUntraced(function* (
  config: LiqvidConfig,
  searchDir: AbsoluteDir,
  baseDir: RelativeDir,
  dryRun: boolean,
  force: boolean,
) {
  // Get glob patterns from config, with sensible defaults
  const patterns = config.publishing?.include?.media ?? DEFAULT_MEDIA_PATTERNS;

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
    yield* showDryRunInfo(provider, mediaFiles, searchDir, config, force);
    return;
  }

  // Publish all media files (paths relative to searchDir)
  yield* provider.publishMedia(mediaFiles, searchDir, force);
  yield* Effect.log("Media publishing complete.");
});

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
      return new LiqvidStudioProvider(
        liqvidStudioConfig,
        config.publishing?.delete ?? false,
      );
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
      const githubPagesConfig = config.providers.githubPages;
      if (!githubPagesConfig) {
        throw new Error(
          "githubPages is configured as content backend but no githubPages provider configuration found",
        );
      }
      return new GitHubPagesProvider(githubPagesConfig);
    }
    case "liqvidStudio": {
      const liqvidStudioConfig = config.providers.liqvidStudio;
      if (!liqvidStudioConfig) {
        throw new Error(
          "liqvidStudio is configured as content backend but no liqvidStudio provider configuration found",
        );
      }
      return new LiqvidStudioProvider(
        liqvidStudioConfig,
        config.publishing?.delete ?? false,
      );
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
const showDryRunInfo = Effect.fnUntraced(function* (
  provider: MediaHostingProvider,
  mediaFiles: readonly AbsoluteFile[],
  rootDir: AbsoluteDir,
  _config: LiqvidConfig,
  force: boolean,
) {
  const fs = yield* FileSystem.FileSystem;

  // Check which files need to be uploaded
  const statuses = yield* provider.checkFiles(mediaFiles, rootDir);

  const toUpload = force ? statuses : statuses.filter((s) => s.needsUpload);
  const unchanged = force ? [] : statuses.filter((s) => !s.needsUpload);

  if (toUpload.length > 0) {
    yield* Effect.log("Files that would be uploaded:\n");
    for (const { filePath, key, reason } of toUpload) {
      const stats = yield* fs.stat(filePath);
      const sizeStr = formatFileSize(stats.size);
      const reasonStr =
        reason === "new"
          ? "(new)"
          : reason === "modified"
            ? "(modified)"
            : "(unchanged, forced)";
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
