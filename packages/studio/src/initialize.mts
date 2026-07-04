import { NodeFileSystem } from "@effect/platform-node";
import type { ProjectMeta } from "@liqvid/schemas";
import type { LiqvidConfig } from "@liqvid/schemas/effect";
import { Effect, Option } from "effect";

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
  config: Option.Option<LiqvidConfig>;
  jobs: {
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
  if (Option.isNone(state.config)) {
    const config = await Effect.runPromise(
      loadLiqvidConfig().pipe(Effect.provide(NodeFileSystem.layer)),
    );
    state.config = config;
  }

  jobs.watchAssets ??= watchAssets();

  jobs.watchConfig ??= Effect.runPromise(
    watchLiqvidConfig(state).pipe(Effect.provide(NodeFileSystem.layer)),
  );

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
      config: Option.none(),
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
