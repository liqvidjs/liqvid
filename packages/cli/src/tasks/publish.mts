import * as fsp from "node:fs/promises";
import * as path from "node:path";

import pluralize from "pluralize";
import type { CommandModule } from "yargs";

import { LiqvidConfig } from "@liqvid/schemas";

import { S3Provider } from "../providers/hosting/s3.mts";

const LIQVID_DIR = ".liqvid";
const CONFIG_FILE = "liqvid.json";

/** Publish media files to configured hosting provider. */
export const publish: CommandModule = {
  builder: (yargs) =>
    yargs
      .example([
        ["liqvid publish"],
        ["liqvid publish --cwd ./my-project"],
        ["liqvid publish --dry-run"],
      ])
      .group(["cwd", "config", "dry-run", "help"], "Options")
      .option("cwd", {
        alias: "C",
        default: process.cwd(),
        desc: "Working directory containing liqvid.json and .liqvid folders",
        normalize: true,
      })
      .option("config", {
        alias: "c",
        desc: `Path to config file (default: ${CONFIG_FILE} in cwd)`,
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
    const dryRun = argv["dry-run"] as boolean;
    const configPath = (argv.config as string) ?? path.join(cwd, CONFIG_FILE);

    // Load and parse config
    const config = await loadConfig(configPath);

    // Find all .liqvid directories
    const liqvidDirs = await findLiqvidDirs(cwd);

    if (liqvidDirs.length === 0) {
      console.log("No .liqvid directories found. Nothing to publish.");
      process.exit(0);
    }

    console.log(
      `Found ${liqvidDirs.length} .liqvid ${pluralize("directory", liqvidDirs.length)}:`,
    );
    for (const dir of liqvidDirs) {
      console.log(`  - ${path.relative(cwd, dir)}`);
    }
    console.log();

    if (dryRun) {
      console.log("Dry run mode - no files will be uploaded.");
      await showDryRunInfo(liqvidDirs);
      process.exit(0);
    }

    // Create provider based on config
    const provider = createProvider(config);

    // Publish all .liqvid directories
    await provider.publishMedia(liqvidDirs);

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
 * Find all .liqvid directories recursively
 */
async function findLiqvidDirs(rootDir: string): Promise<string[]> {
  const liqvidDirs: string[] = [];

  async function search(dir: string): Promise<void> {
    const entries = await fsp.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.name === LIQVID_DIR) {
        liqvidDirs.push(fullPath);
      } else if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        // Recursively search subdirectories (skip hidden dirs and node_modules)
        await search(fullPath);
      }
    }
  }

  await search(rootDir);
  return liqvidDirs.sort();
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
async function showDryRunInfo(liqvidDirs: string[]): Promise<void> {
  console.log("\nFiles that would be uploaded:\n");

  for (const dir of liqvidDirs) {
    console.log(`${dir}/`);
    const files = await getAllFiles(dir);
    for (const file of files) {
      const relativePath = path.relative(dir, file);
      const stats = await fsp.stat(file);
      const sizeStr = formatFileSize(stats.size);
      console.log(`  ${relativePath} (${sizeStr})`);
    }
    console.log();
  }
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort();
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
