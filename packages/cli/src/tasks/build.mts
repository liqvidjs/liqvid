import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { LiqvidConfig } from "@liqvid/schemas";
import { execa } from "execa";
import type { CommandModule } from "yargs";

import { CopyProvider } from "../providers/hosting/copy.mts";
import { LiqvidStudioProvider } from "../providers/hosting/liqvid-studio.mts";
import { S3Provider } from "../providers/hosting/s3.mts";
import { SFTPProvider } from "../providers/hosting/sftp.mts";
import type { MediaHostingProvider } from "../providers/types.mts";

const CONFIG_FILE = "liqvid.json";
const ERROR_LOG_PATH = path.join(process.cwd(), "logs/build-errors.log");

function getErrorLogStream(): fs.WriteStream {
  const logsDir = path.dirname(ERROR_LOG_PATH);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return fs.createWriteStream(ERROR_LOG_PATH, { flags: "a" });
}

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
    const cwd = args.cwd as string;
    const configPath = (args.config as string) ?? path.join(cwd, CONFIG_FILE);
    await runNextBuild({ configPath, cwd });
  },
};

export interface BuildOptions {
  /** Path to liqvid.json config file */
  configPath?: string;
  /** Working directory */
  cwd?: string;
}

/**
 * Load and validate the liqvid.json config file
 */
async function loadConfig(configPath: string): Promise<LiqvidConfig | null> {
  try {
    const content = await fsp.readFile(configPath, "utf-8");
    const rawConfig = JSON.parse(content);
    const result = LiqvidConfig.safeParse(rawConfig);

    if (!result.success) {
      console.warn(`Warning: Invalid liqvid.json config:`);
      for (const issue of result.error.issues) {
        console.warn(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      return null;
    }

    return result.data;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // Config file not found - that's okay for build
      return null;
    }
    throw err;
  }
}

/**
 * Get the media provider from the config
 */
function getMediaProvider(config: LiqvidConfig): MediaHostingProvider | null {
  switch (config.backend.media) {
    case "copy": {
      const copyConfig = config.providers.copy;
      if (!copyConfig) {
        return null;
      }
      return new CopyProvider(copyConfig);
    }
    case "liqvidStudio": {
      const liqvidStudioConfig = config.providers.liqvidStudio;
      if (!liqvidStudioConfig) {
        return null;
      }
      return new LiqvidStudioProvider(liqvidStudioConfig);
    }
    case "s3": {
      const s3Config = config.providers.s3;
      if (!s3Config) {
        return null;
      }
      return new S3Provider(s3Config);
    }
    case "sftp": {
      const sftpConfig = config.providers.sftp;
      if (!sftpConfig) {
        return null;
      }
      return new SFTPProvider(sftpConfig);
    }
  }
}

/**
 * Run Next.js build
 */
export async function runNextBuild(options: BuildOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? path.join(cwd, CONFIG_FILE);

  // Load config to get media base URL
  const config = await loadConfig(configPath);
  const env: Record<string, string> = {
    ...process.env,
    NODE_ENV: "production",
  };

  if (config) {
    const mediaProvider = getMediaProvider(config);
    if (mediaProvider) {
      const mediaBaseUrl = mediaProvider.getBaseUrl();
      env.NEXT_PUBLIC_LIQVID_MEDIA_BASE = mediaBaseUrl;
      console.log(`Setting NEXT_PUBLIC_LIQVID_MEDIA_BASE=${mediaBaseUrl}`);
    }
  }

  console.log("Running 'next build'...");
  const errorLogStream = getErrorLogStream();

  const buildProcess = execa("npx", ["next", "build"], {
    cwd,
    env,
    stderr: "pipe",
    stdout: "inherit",
  });
  buildProcess.stderr?.pipe(errorLogStream, { end: false });
  await buildProcess;
  console.log("'next build' completed.");
}
