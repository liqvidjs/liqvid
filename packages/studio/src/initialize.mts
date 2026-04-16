import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

import { runNextBuild } from "@liqvid/cli/build";
import type { ProjectMeta } from "@liqvid/schemas";
import handler from "serve-handler";

import { watchAssets } from "./jobs/watch-assets.mts";
import { watchProjectFiles } from "./jobs/watch-project-files.mts";

const symbol = Symbol.for("@liqvid/server");

const DEFAULT_PRODUCTION_SERVER_PORT = 4000;

export interface LiqvidServerState {
  jobs: {
    // TODO: use Async.Idle here
    productionServer: null | Promise<void>;
    watchAssets: null | Promise<void>;
    watchProjectFiles: null | Promise<void>;
  };
  productionServerPort: number;
  projects: Record<string, ProjectMeta>;
}

type GlobalThis = {
  [symbol]: LiqvidServerState;
};

export async function initializeServer() {
  const state = getServerState();
  const { jobs, projects } = state;

  jobs.watchAssets ??= watchAssets();

  jobs.watchProjectFiles ??= jobs.watchAssets.then(() =>
    watchProjectFiles(projects),
  );

  jobs.productionServer ??= startProductionServer(state);

  await jobs.watchProjectFiles;
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
 * Get an environment variable, first checking .env.production, then process.env.
 */
function getEnvVar(
  name: string,
  envProduction: Record<string, string>,
): string | undefined {
  return envProduction[name] ?? process.env[name];
}

async function startProductionServer(state: LiqvidServerState): Promise<void> {
  const outDir = path.join(process.cwd(), "out");

  // Check if 'out' directory exists, if not run 'next build'
  if (!fs.existsSync(outDir)) {
    console.log("'out' directory not found, running 'next build'...");
    await runNextBuild();
  }

  // Parse .env.production for environment variables
  const envProductionPath = path.join(process.cwd(), ".env.production");
  const envProduction = parseEnvFile(envProductionPath);

  // Start the production server
  const port =
    Number(getEnvVar("LIQVID_PRODUCTION_SERVER_PORT", envProduction)) ||
    DEFAULT_PRODUCTION_SERVER_PORT;
  state.productionServerPort = port;

  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: outDir,
      trailingSlash: true,
    });
  });

  server.listen(port, () => {
    console.log(`Production server running on port ${port}...`);
  });
}

export function getServerState(): LiqvidServerState {
  if (!(symbol in globalThis)) {
    (globalThis as unknown as GlobalThis)[symbol] = {
      jobs: {
        productionServer: null,
        watchAssets: null,
        watchProjectFiles: null,
      },
      productionServerPort: DEFAULT_PRODUCTION_SERVER_PORT,
      projects: {},
    };
  }

  return (globalThis as unknown as GlobalThis)[symbol];
}
