import { type Maybe, None } from "@liqvid/fp";
import type { LiqvidConfigOut, ProjectMeta } from "@liqvid/schemas";

import {
  DEFAULT_PRODUCTION_SERVER_PORT,
  startProductionServer,
} from "./jobs/preview-server.mts";
import { watchAssets } from "./jobs/watch-assets.mts";
import { loadLiqvidConfig, watchLiqvidConfig } from "./jobs/watch-config.mts";
import { watchProjectFiles } from "./jobs/watch-project-files.mts";

const symbol = Symbol.for("@liqvid/server");

export interface LiqvidServerState {
  /**
   * Base path that content is hosted under.
   * Resolved from liqvid.json basePath with environment variable interpolation.
   */
  basePath: string;
  /**
   * The full parsed liqvid.config.json
   */
  config: Maybe<LiqvidConfigOut>;
  jobs: {
    // TODO: use Async.Idle here
    productionServer: null | Promise<void>;
    watchAssets: null | Promise<void>;
    watchConfig: null | Promise<void>;
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

  // Load config initially
  if (state.config.isNone) {
    state.config = loadLiqvidConfig().ok();
  }

  jobs.watchAssets ??= watchAssets();

  jobs.watchConfig ??= watchLiqvidConfig(state);

  jobs.watchProjectFiles ??= jobs.watchAssets.then(() =>
    watchProjectFiles(projects),
  );

  jobs.productionServer ??= startProductionServer(state);

  await jobs.watchProjectFiles;
}

export function getServerState(): LiqvidServerState {
  if (!(symbol in globalThis)) {
    (globalThis as unknown as GlobalThis)[symbol] = {
      basePath: "",
      config: None,
      jobs: {
        productionServer: null,
        watchAssets: null,
        watchConfig: null,
        watchProjectFiles: null,
      },
      productionServerPort: DEFAULT_PRODUCTION_SERVER_PORT,
      projects: {},
    };
  }

  return (globalThis as unknown as GlobalThis)[symbol];
}
