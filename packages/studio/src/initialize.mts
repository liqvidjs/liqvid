import type { ProjectMeta } from "@liqvid/schemas";

import {
  DEFAULT_PRODUCTION_SERVER_PORT,
  startProductionServer,
} from "./jobs/preview-server.mts";
import { watchAssets } from "./jobs/watch-assets.mts";
import { watchProjectFiles } from "./jobs/watch-project-files.mts";

const symbol = Symbol.for("@liqvid/server");

export interface LiqvidServerState {
  /**
   * Base path that content is hosted under.
   * Resolved from liqvid.json basePath with environment variable interpolation.
   */
  basePath: string;
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

export function getServerState(): LiqvidServerState {
  if (!(symbol in globalThis)) {
    (globalThis as unknown as GlobalThis)[symbol] = {
      basePath: "",
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
