import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import { EnvFiles, type LiqvidConfig } from "@liqvid/schemas";
import { Effect, Option, References } from "effect";
import type { AbsoluteDir, AbsoluteFile } from "effect-paths";
import { execa } from "execa";
import type { CommandModule } from "yargs";

import { CopyProvider } from "#_/providers/hosting/copy.mjs";
import { LiqvidStudioProvider } from "#_/providers/hosting/liqvid-studio.mjs";
import { S3Provider } from "#_/providers/hosting/s3.mjs";
import { SFTPProvider } from "#_/providers/hosting/sftp.mjs";
import type { MediaHostingProvider } from "#_/providers/types.mjs";
import {
  loadEnvFiles,
  loadLiqvidConfig,
  resolveConfigPath,
} from "#_/utils/effect.mjs";

import { CONFIG_FILE, CONFIG_FILE_JSONC } from "./conventions.mts";

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
        desc: `Path to config file (default: ${CONFIG_FILE_JSONC} or ${CONFIG_FILE} in cwd)`,
        normalize: true,
      }),
  command: "build",
  describe: "Build project",
  handler: async (args) => {
    const cwd = args.cwd as AbsoluteDir;
    await Effect.runPromise(
      Effect.gen(function* () {
        const configPath =
          (args.config as AbsoluteFile | undefined) ??
          (yield* resolveConfigPath({ cwd }));
        yield* runNextBuild({ configPath, cwd });
      }).pipe(
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
export const runNextBuild = Effect.fn("runNextBuild")(function* (
  options: BuildOptions = {},
) {
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

  // Capture the current context (which carries the active logger) so that
  // output lines forwarded from the subprocess are logged through the same
  // logger as the surrounding effect (e.g. the studio job's log collector).
  const context = yield* Effect.context<never>();
  const runFork = Effect.runForkWith(context);

  // Run the build, capturing stdout/stderr so that callers (e.g. the studio
  // jobs UI) can surface the output. Each line is forwarded to the logger as
  // it is produced so logs stream in real time, and the full stderr is
  // retained for error parsing.
  const result = yield* Effect.callback<Awaited<ReturnType<typeof execa>>>(
    (resume, signal) => {
      const subprocess = execa("npx", ["next", "build"], {
        cwd,
        env,
        reject: false,
        stderr: "pipe",
        stdout: "pipe",
      });

      // Kill the subprocess if the effect is interrupted (e.g. job cancel).
      signal.addEventListener("abort", () => subprocess.kill());

      const forward = (
        stream: NodeJS.ReadableStream | null,
        log: (line: string) => Effect.Effect<void>,
      ) => {
        if (!stream) return;
        let buffer = "";
        stream.setEncoding("utf8");
        stream.on("data", (chunk: string) => {
          buffer += chunk;
          let index = buffer.indexOf("\n");
          while (index !== -1) {
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            runFork(log(line));
            index = buffer.indexOf("\n");
          }
        });
        stream.on("end", () => {
          if (buffer.length > 0) {
            runFork(log(buffer));
          }
        });
      };

      forward(subprocess.stdout, (line) => Effect.log(line));
      forward(subprocess.stderr, (line) => Effect.logError(line));

      subprocess.then(
        (value) => resume(Effect.succeed(value)),
        // execa is configured with `reject: false`, so it should not reject;
        // surface any unexpected rejection as a defect.
        (error) => resume(Effect.die(error)),
      );
    },
  );

  if (result.exitCode !== 0) {
    const stderrOutput = typeof result.stderr === "string" ? result.stderr : "";
    const messages = parseNextBuildErrors(stderrOutput);
    return yield* Effect.fail({ messages });
  }

  yield* Effect.log("'next build' completed.");
});

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
