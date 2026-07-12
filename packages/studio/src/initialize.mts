import { NodeFileSystem } from "@effect/platform-node";
import { loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import {
  EnvFiles,
  type LiqvidConfig,
  type Locale,
  type ProjectMeta,
} from "@liqvid/schemas/effect";
import { Effect, Option } from "effect";

import {
  DEFAULT_PRODUCTION_SERVER_PORT,
  startProductionServer,
} from "./jobs/preview-server.mts";
import { watchAssets } from "./jobs/watch-assets.mts";
import { watchLiqvidConfig } from "./jobs/watch-config.mts";
import { watchProjectFiles } from "./jobs/watch-project-files.mts";
import type { LoggableJob } from "./types.mts";

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
  locale: Locale;
  jobs: {
    productionServer: null | Promise<void>;
    captioning: Set<LoggableJob>;
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
      loadLiqvidConfig().pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provideService(EnvFiles, loadEnvFiles(process.cwd())),
      ),
    );

    state.locale = config.locale ?? state.locale;

    state.config = Option.some(config);
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
        captioning: new Set(),
        productionServer: null,
        watchAssets: null,
        watchConfig: null,
        watchProjectFiles: null,
      },
      locale: "en",
      productionServerPort: DEFAULT_PRODUCTION_SERVER_PORT,
      projects: {},
    };
  }

  return (globalThis as unknown as GlobalThis)[symbol];
}
