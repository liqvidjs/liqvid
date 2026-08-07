import { NodeFileSystem } from "@effect/platform-node";
import { loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import { EnvFiles, type LiqvidConfig, type ProjectMeta } from "@liqvid/schemas";
import { Effect, Option } from "effect";
import type { Socket } from "effect/unstable/socket";
import type { AbsoluteDir } from "effect-paths";

import type { LoggableJob } from "./api/schemas.mts";
import { type UpdateInfo, watchForUpdates } from "./jobs/check-updates.mts";
import {
  DEFAULT_PRODUCTION_SERVER_PORT,
  startProductionServer,
} from "./jobs/preview-server.mts";
import { watchAssets } from "./jobs/watch-assets.mts";
import { watchLiqvidConfig } from "./jobs/watch-config.mts";
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

  /**
   * Current working directory, captured at initialization time.
   */
  cwd: AbsoluteDir;
  jobs: {
    checkUpdates: null | Promise<void>;
    productionServer: null | Promise<void>;
    new: Map<string, LoggableJob>;
    watchAssets: null | Promise<void>;
    watchConfig: null | Promise<void>;
    watchProjectFiles: null | Promise<void>;
  };

  /**
   * Timestamp (`Date.now()`) of the last build/publish operation, or `null` if
   * none has occurred since the server started.
   */
  lastBuildTime: null | number;

  productionServerPort: number;
  projects: Record<string, ProjectMeta>;

  started: {
    productionServer: boolean;
  };

  /**
   * Latest npm update check for the tracked Liqvid packages, or `null` if a
   * check has not completed yet.
   */
  updateInfo: null | UpdateInfo;

  /**
   * Connections currently subscribed to each channel, keyed by channel name.
   * Every connection is subscribed to every channel for now; the envelope's
   * `channel` field is what routes messages on the client.
   */
  wsConnections: Set<
    (frame: string) => Effect.Effect<void, Socket.SocketError>
  >;
}

type GlobalThis = {
  [symbol]: LiqvidServerState;
};

export async function initializeServer() {
  const state = getServerState();
  const { cwd, jobs, projects, started } = state;

  let envFiles: EnvFiles;

  // Load config initially
  if (Option.isNone(state.config)) {
    envFiles ??= loadEnvFiles(cwd);
    const config = await Effect.runPromise(
      loadLiqvidConfig().pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provideService(EnvFiles, envFiles),
      ),
    );

    state.config = Option.some(config);
  }

  jobs.checkUpdates ??= watchForUpdates();

  jobs.watchAssets ??= watchAssets();

  jobs.watchConfig ??= Effect.runPromise(
    watchLiqvidConfig(state).pipe(Effect.provide(NodeFileSystem.layer)),
  );

  jobs.watchProjectFiles ??= jobs.watchAssets.then(() =>
    watchProjectFiles(projects),
  );

  if (!started.productionServer) {
    envFiles ??= loadEnvFiles(cwd);
    Effect.runFork(
      startProductionServer(state).pipe(
        Effect.provide(NodeFileSystem.layer),
        Effect.provideService(EnvFiles, envFiles),
      ),
    );
    started.productionServer = true;
  }

  await jobs.watchProjectFiles;
}

export function getServerState(): LiqvidServerState {
  if (!(symbol in globalThis)) {
    (globalThis as unknown as GlobalThis)[symbol] = {
      basePath: "",
      config: Option.none(),
      cwd: process.cwd(),
      jobs: {
        checkUpdates: null,
        new: new Map(),
        productionServer: null,
        watchAssets: null,
        watchConfig: null,
        watchProjectFiles: null,
      },
      lastBuildTime: null,
      productionServerPort: DEFAULT_PRODUCTION_SERVER_PORT,
      projects: {},
      started: {
        productionServer: false,
      },
      updateInfo: null,
      wsConnections: new Set(),
    };
  }

  return (globalThis as unknown as GlobalThis)[symbol];
}
