import * as fs from "node:fs";
import * as path from "node:path";

import type { ProjectMeta } from "@liqvid/schemas";
import { execa } from "execa";

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

async function startProductionServer(state: LiqvidServerState): Promise<void> {
  const outDir = path.join(process.cwd(), "out");

  // Check if 'out' directory exists, if not run 'next build'
  if (!fs.existsSync(outDir)) {
    console.log("'out' directory not found, running 'next build'...");
    await runNextBuild();
  }

  // Start the production server
  const port =
    Number(process.env.LIQVID_PRODUCTION_SERVER_PORT) ||
    DEFAULT_PRODUCTION_SERVER_PORT;
  state.productionServerPort = port;

  console.log(`Starting production server on port ${port}...`);
  execa("npx", ["serve", "out", "-p", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "production" },
    stderr: "inherit",
    stdout: "inherit",
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
