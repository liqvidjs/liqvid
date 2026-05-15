import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

import { runNextBuild } from "@liqvid/cli/build";
import handler from "serve-handler";

import { CONFIG_FILE } from "../conventions.mts";
import type { LiqvidServerState } from "../initialize.mts";

export const DEFAULT_PRODUCTION_SERVER_PORT = 4000;

export async function startProductionServer(
  state: LiqvidServerState,
): Promise<void> {
  const previewDir = path.join(process.cwd(), ".liqvid", "preview");

  // Check if 'out' directory exists, if not run 'next build'
  if (!fs.existsSync(previewDir)) {
    console.log("'out' directory not found, running 'next build'...");
    await runNextBuild();
  }

  // Parse environment files
  const envFiles = loadEnvFiles(process.cwd());

  // Load liqvid.json config
  const config = loadLiqvidConfig(process.cwd(), envFiles);
  const basePath = config?.basePath ?? "";
  state.basePath = basePath;

  // Setup symlinks for basePath if configured
  await setupPreviewSymlinks(previewDir, basePath);

  // Start the production server
  const port =
    Number(
      getEnvVar("LIQVID_PRODUCTION_SERVER_PORT", envFiles.production, {}),
    ) || DEFAULT_PRODUCTION_SERVER_PORT;
  state.productionServerPort = port;

  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: previewDir,
      trailingSlash: true,
    });
  });

  server.listen(port, () => {
    console.log(`Production server running on port ${port}...`);
  });
}

interface EnvFiles {
  development: Record<string, string>;
  production: Record<string, string>;
}

/**
 * Load all environment files (.env, .env.development, .env.production).
 */
function loadEnvFiles(rootDir: string): EnvFiles {
  return {
    development: parseEnvFile(path.join(rootDir, ".env.development")),
    production: parseEnvFile(path.join(rootDir, ".env.production")),
  };
}

interface LiqvidConfig {
  basePath?: string;
}

/**
 * Load and parse liqvid.json, resolving environment variable placeholders.
 */
function loadLiqvidConfig(
  rootDir: string,
  envFiles: EnvFiles,
): LiqvidConfig | null {
  const configPath = path.join(rootDir, CONFIG_FILE);

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as Record<string, unknown>;

    // Resolve basePath if present
    if (typeof config.basePath === "string") {
      return {
        basePath: interpolateEnvVars(config.basePath, envFiles),
      };
    }

    return {};
  } catch {
    // Config file doesn't exist or can't be parsed
    return null;
  }
}

/**
 * Interpolate environment variable placeholders in a string.
 * Supports:
 *   - {env:VAR_NAME} - reads from process.env
 *   - {env:production:VAR_NAME} - reads from .env.production
 *   - {env:development:VAR_NAME} - reads from .env.development
 */
function interpolateEnvVars(str: string, envFiles: EnvFiles): string {
  // Match {env:VAR_NAME} or {env:environment:VAR_NAME}
  return str.replace(/\{env:([^}]+)\}/g, (_match, content: string) => {
    const parts = content.split(":");

    if (parts.length === 1) {
      // {env:VAR_NAME} - use process.env
      const varName = parts[0];
      const value = process.env[varName];
      if (value === undefined) {
        throw new Error(`Environment variable ${varName} is not set`);
      }
      return value;
    } else if (parts.length === 2) {
      // {env:environment:VAR_NAME}
      const [environment, varName] = parts;

      if (environment === "production") {
        const value = envFiles.production[varName] ?? process.env[varName];
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} is not set in .env.production or process.env`,
          );
        }
        return value;
      } else if (environment === "development") {
        const value = envFiles.development[varName] ?? process.env[varName];
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} is not set in .env.development or process.env`,
          );
        }
        return value;
      } else {
        throw new Error(
          `Invalid environment "${environment}" in placeholder. Use "production" or "development".`,
        );
      }
    } else {
      throw new Error(
        `Invalid environment variable placeholder: {env:${content}}`,
      );
    }
  });
}

/**
 * Setup symlinks in the preview directory to support basePath.
 * For example, if basePath is "/videos", creates .liqvid/preview/videos -> ../../out
 */
async function setupPreviewSymlinks(
  previewDir: string,
  basePath: string,
): Promise<void> {
  // Ensure preview directory exists
  fs.mkdirSync(previewDir, { recursive: true });

  // Clean up any existing symlinks in preview directory (except 'out' itself)
  const entries = fs.readdirSync(previewDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      fs.unlinkSync(path.join(previewDir, entry.name));
    }
  }

  if (!basePath) {
    // No basePath configured, symlink preview directly to out
    const outPath = path.join(process.cwd(), "out");
    if (fs.existsSync(outPath)) {
      // Copy/symlink contents from out to preview
      const outEntries = fs.readdirSync(outPath, { withFileTypes: true });
      for (const entry of outEntries) {
        const srcPath = path.join(outPath, entry.name);
        const destPath = path.join(previewDir, entry.name);

        // Remove existing if present
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true });
        }

        // Create symlink
        fs.symlinkSync(srcPath, destPath);
      }
    }
    return;
  }

  // basePath is configured (e.g., "/videos")
  // Create symlink: .liqvid/preview/videos -> ../../out
  const normalizedBasePath = basePath.replace(/^\/+/, ""); // Remove leading slashes
  const symlinkPath = path.join(previewDir, normalizedBasePath);

  // Ensure parent directories exist
  fs.mkdirSync(path.dirname(symlinkPath), { recursive: true });

  // Calculate relative path from symlink location to 'out' directory
  const outPath = path.join(process.cwd(), "out");
  const relativePath = path.relative(path.dirname(symlinkPath), outPath);

  // Remove existing symlink/directory if present
  if (fs.existsSync(symlinkPath)) {
    fs.rmSync(symlinkPath, { recursive: true });
  }

  // Create symlink
  if (fs.existsSync(outPath)) {
    fs.symlinkSync(relativePath, symlinkPath);
    console.log(`Created symlink: ${symlinkPath} -> ${relativePath}`);
  }
}

/**
 * Parse a .env file and return key-value pairs.
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  } catch {
    // File doesn't exist or can't be read, return empty object
  }

  return result;
}

/**
 * Get an environment variable, first checking the env file, then process.env.
 */
function getEnvVar(
  name: string,
  envFile: Record<string, string>,
  _envFiles: Record<string, unknown>,
): string | undefined {
  return envFile[name] ?? process.env[name];
}
