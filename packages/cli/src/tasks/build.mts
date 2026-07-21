import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { EnvFiles, type LiqvidConfig } from "@liqvid/schemas";
import { Effect, Option, References } from "effect";
import type { AbsoluteDir, AbsoluteFile } from "effect-paths";
import { execa } from "execa";
import type { CommandModule } from "yargs";

import { CopyProvider } from "../providers/hosting/copy.mts";
import { LiqvidStudioProvider } from "../providers/hosting/liqvid-studio.mts";
import { S3Provider } from "../providers/hosting/s3.mts";
import { SFTPProvider } from "../providers/hosting/sftp.mts";
import type { MediaHostingProvider } from "../providers/types.mts";
import { loadEnvFiles, loadLiqvidConfig } from "../utils/effect.mts";

import { CONFIG_FILE } from "./conventions.mts";

/**
 * Build project
 */
export const build: CommandModule = {
  builder: (yargs) =>
    yargs
      .option("cwd", {
        alias: "C",
        coerce: path.resolve,
        default: process.cwd(),
        desc: "Working directory",
      })
      .option("config", {
        alias: "c",
        desc: `Path to config file (default: ${CONFIG_FILE} in cwd)`,
        normalize: true,
      }),
  command: "build",
  describe: "Build project",
  handler: async (args) => {
    const cwd = args.cwd as AbsoluteDir;
    const configPath =
      (args.config as AbsoluteFile) ?? path.join(cwd, CONFIG_FILE);
    await Effect.runPromise(
      runNextBuild({ configPath, cwd }).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provideService(References.MinimumLogLevel, "Debug"),
      ),
    );
  },
};

export interface BuildOptions {
  /** Path to liqvid.json config file */
  configPath?: AbsoluteFile;

  /** Working directory */
  cwd?: AbsoluteDir;
}

/**
 * Get the media provider from the config
 */
function getMediaProvider(
  config: LiqvidConfig,
): Option.Option<MediaHostingProvider> {
  if (!config.backend?.media) {
    return Option.none();
  }

  switch (config.backend.media) {
    case "copy": {
      return Option.fromNullishOr(config.providers.copy).pipe(
        Option.map((copyConfig) => new CopyProvider(copyConfig)),
      );
    }
    case "liqvidStudio": {
      return Option.fromNullishOr(config.providers.liqvidStudio).pipe(
        Option.map(
          (liqvidStudioConfig) => new LiqvidStudioProvider(liqvidStudioConfig),
        ),
      );
    }

    case "s3":
      return Option.fromNullishOr(config.providers.s3).pipe(
        Option.map((s3Config) => new S3Provider(s3Config)),
      );
    case "sftp": {
      return Option.fromNullishOr(config.providers.sftp).pipe(
        Option.map((sftpConfig) => new SFTPProvider(sftpConfig)),
      );
    }
  }
}

/** Error returned when build fails */
export type BuildError = {
  /** Error messages from the build process */
  messages: string[];
};

/**
 * Run Next.js build
 */
export function runNextBuild(options: BuildOptions = {}) {
  return Effect.gen(function* () {
    const cwd = options.cwd ?? process.cwd();
    const configPath = options.configPath ?? path.join(cwd, CONFIG_FILE);

    const envFiles = loadEnvFiles(cwd);

    // Load config to get media base URL
    const config = yield* loadLiqvidConfig({ configPath }).pipe(
      Effect.provideService(EnvFiles, envFiles),
    );

    const env: Record<string, string> = {
      ...process.env,
      ...envFiles.production,
      ...envFiles.local,
      NODE_ENV: "production",
    };

    if (config) {
      const mediaProvider = getMediaProvider(config);
      if (Option.isSome(mediaProvider)) {
        const mediaBaseUrl = mediaProvider.value.getBaseUrl();
        env.NEXT_PUBLIC_LIQVID_MEDIA_BASE = mediaBaseUrl;
      }
    }

    yield* Effect.log("Running 'next build'...");

    const result = yield* Effect.promise(() =>
      execa("npx", ["next", "build"], {
        cwd,
        env,
        reject: false,
        stderr: "pipe",
        stdout: "inherit",
      }),
    );

    if (result.exitCode !== 0) {
      const stderrOutput = result.stderr || "";
      const messages = parseNextBuildErrors(stderrOutput);
      return yield* Effect.fail({ messages });
    }

    yield* Effect.log("'next build' completed.");
  });
}

/**
 * Parse error messages from Next.js build stderr output
 */
function parseNextBuildErrors(stderr: string): string[] {
  if (!stderr.trim()) {
    return ["Build failed with unknown error"];
  }

  // Split by common error patterns and filter empty lines
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Look for TypeScript/build errors that typically start with file paths or "Error:"
  const errorMessages: string[] = [];
  let currentError = "";

  for (const line of lines) {
    // Lines starting with file paths (e.g., "./src/file.ts:10:5") or "Error:" are error starts
    if (
      /^\.?\/?[a-zA-Z]/.test(line) ||
      line.startsWith("Error:") ||
      line.startsWith("error")
    ) {
      if (currentError) {
        errorMessages.push(currentError);
      }
      currentError = line;
    } else if (currentError) {
      // Continuation of the current error
      currentError += " " + line;
    }
  }

  if (currentError) {
    errorMessages.push(currentError);
  }

  // If we couldn't parse specific errors, return the whole stderr
  if (errorMessages.length === 0) {
    return [stderr.trim()];
  }

  return errorMessages;
}
