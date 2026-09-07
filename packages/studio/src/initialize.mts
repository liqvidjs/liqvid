import { loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import { EnvFiles, type LiqvidConfig, type ProjectMeta } from "@liqvid/schemas";
import { Effect, Option } from "effect";
import type { Socket } from "effect/unstable/socket";
import type { AbsoluteDir } from "effect-paths";

import type { LoggableJob, Service } from "./api/schemas.mts";
import { type UpdateInfo, watchForUpdates } from "./jobs/check-updates.mts";
import { serverRuntime } from "./server-runtime.mts";
import {
  DEFAULT_PRODUCTION_SERVER_PORT,
  startProductionServer,
} from "./services/preview-server.mts";
import { watchAssets } from "./services/watch-assets.mts";
import { watchLiqvidConfig } from "./services/watch-config.mts";
import {
  initProjectFiles,
  watchProjectFiles,
} from "./services/watch-project-files.mts";
import { watchRootTypes } from "./services/watch-root-types.mts";
import { createService } from "./utils/services.mts";

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
    new: Map<string, LoggableJob>;
  };

  /**
   * Timestamp (`Date.now()`) of the last build/publish operation, or `null` if
   * none has occurred since the server started.
   */
  lastBuildTime: null | number;

  productionServerPort: number;
  projects: Record<string, ProjectMeta>;

  /**
   * Long-running services (production server, file watchers), keyed by id.
   * Unlike {@link LiqvidServerState.jobs}, these are not expected to complete;
   * they run for the lifetime of the process. Their captured logs are streamed
   * to the Jobs page.
   */
  services: Map<string, Service>;

  started: {
    productionServer: boolean;
    watchAssets: boolean;
    watchConfig: boolean;
    watchProjectFiles: boolean;
    watchRootTypes: boolean;
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
    const config = await serverRuntime.runPromise(
      loadLiqvidConfig().pipe(Effect.provideService(EnvFiles, envFiles)),
    );

    state.config = Option.some(config);
  }

  jobs.checkUpdates ??= watchForUpdates();

  // Long-running watchers are registered as services so their log output is
  // captured and streamed to the Jobs page. `createService` forks each effect
  // detached and resolves immediately, so these promises resolve once the
  // service has been registered (not when the watcher finishes).

  if (!started.watchConfig) {
    serverRuntime.runSync(
      createService("watch config", watchLiqvidConfig(state)),
    );

    started.watchConfig = true;
  }

  if (!started.watchRootTypes) {
    serverRuntime.runSync(
      createService("watch root types", watchRootTypes(state)),
    );

    started.watchRootTypes = true;
  }

  // Do the initial scan of the project tree first so `projects` is fully
  // populated, then start the watchers. Starting them only after the initial
  // run succeeds avoids racing the watch events against the initial scan.
  //
  // The flags are flipped *before* awaiting the initial scan so a concurrent
  // `initializeServer()` call doesn't slip past the guard while the scan is in
  // flight and start the watchers a second time.
  if (!started.watchProjectFiles && !started.watchAssets) {
    started.watchProjectFiles = true;
    started.watchAssets = true;

    await serverRuntime.runPromise(initProjectFiles(projects));

    serverRuntime.runSync(
      createService("watch project files", watchProjectFiles(projects)),
    );

    serverRuntime.runSync(createService("watch assets", watchAssets()));
  }

  if (!started.productionServer) {
    envFiles ??= loadEnvFiles(cwd);
    void serverRuntime.runPromise(
      createService(
        "production server",
        startProductionServer(state).pipe(
          Effect.provideService(EnvFiles, envFiles),
        ),
      ).pipe(Effect.asVoid),
    );
    started.productionServer = true;
  }
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
      },
      lastBuildTime: null,
      productionServerPort: DEFAULT_PRODUCTION_SERVER_PORT,
      projects: {},
      services: new Map(),
      started: {
        productionServer: false,
        watchAssets: false,
        watchConfig: false,
        watchProjectFiles: false,
        watchRootTypes: false,
      },
      updateInfo: null,
      wsConnections: new Set(),
    };
  }

  return (globalThis as unknown as GlobalThis)[symbol];
}
