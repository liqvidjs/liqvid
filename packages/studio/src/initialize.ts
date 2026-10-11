import { loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import { EnvFiles, type LiqvidConfig, type ProjectMeta } from "@liqvid/schemas";
import { Effect, Fiber, Match, Option } from "effect";
import type { Socket } from "effect/socket";
import type { AbsoluteDir } from "effect-paths";

import type { LoggableJob, Service } from "./api/schemas.ts";
import { type UpdateInfo, watchForUpdates } from "./jobs/check-updates.ts";
import { serverRuntime } from "./server-runtime.ts";
import { startPreviewServer } from "./services/preview-server.ts";
import { watchAssets } from "./services/watch-assets.ts";
import { watchLiqvidConfig } from "./services/watch-config.ts";
import {
  initProjectFiles,
  watchProjectFiles,
} from "./services/watch-project-files.ts";
import { watchRootTypes } from "./services/watch-root-types.ts";
import { createService } from "./utils/services.ts";

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

  previewServerService: Service | null;
  projects: Record<string, ProjectMeta>;

  /** Resolves after the initial project scan and file watchers are ready. */
  projectsInitialized: Promise<void> | null;

  /**
   * Long-running services (preview server, file watchers), keyed by id.
   * Unlike {@link LiqvidServerState.jobs}, these are not expected to complete;
   * they run for the lifetime of the process. Their captured logs are streamed
   * to the Jobs page.
   */
  services: Map<string, Service>;

  started: {
    previewServer: boolean;
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

export async function initializeServer({ waitForProjects = true } = {}) {
  const state = getServerState();
  const { cwd, jobs, started } = state;

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

  // Share the initial scan across concurrent requests. Start the watchers only
  // after it succeeds so watch events cannot race the initial population.
  if (state.projectsInitialized === null) {
    started.watchProjectFiles = true;
    started.watchAssets = true;

    const projectsInitialized = initializeProjects(state);
    state.projectsInitialized = projectsInitialized;
    // Some routes defer project loading without rendering the project list.
    // Keep a later await able to observe the rejection without an unhandled
    // rejection warning in the meantime.
    void projectsInitialized.then(undefined, () => undefined);
  }

  if (waitForProjects) {
    const projectsInitialized = state.projectsInitialized;
    if (projectsInitialized === null) {
      throw new Error("Project initialization was not started");
    }
    await projectsInitialized;
  }

  await serverRuntime.runPromise(syncPreviewServer(state));
}

async function initializeProjects(state: LiqvidServerState): Promise<void> {
  try {
    await serverRuntime.runPromise(initProjectFiles(state.projects));
  } catch (error) {
    // A failed scan must leave initialization retryable.
    state.projectsInitialized = null;
    state.started.watchProjectFiles = false;
    state.started.watchAssets = false;
    throw error;
  }

  serverRuntime.runSync(
    createService("watch project files", watchProjectFiles(state.projects)),
  );

  serverRuntime.runSync(createService("watch assets", watchAssets()));
}

/** Keep the preview server's lifecycle in sync with the loaded config. */
export const syncPreviewServer = Effect.fnUntraced(function* (
  state: LiqvidServerState,
) {
  const config = Option.getOrNull(state.config);
  const enabled = config?.previewServer.enabled ?? false;
  state.basePath = config
    ? Match.value(config.backend?.content).pipe(
        Match.when("copy", () => config.providers.copy?.basePath ?? ""),
        Match.when("sftp", () => config.providers.sftp?.basePath ?? ""),
        Match.orElse(() => ""),
      )
    : "";

  if (state.previewServerService?.state !== "running") {
    state.previewServerService = null;
    state.started.previewServer = false;
  }

  if (enabled && state.previewServerService === null) {
    const envFiles = loadEnvFiles(state.cwd);
    state.previewServerService = yield* createService(
      "preview server",
      startPreviewServer(state).pipe(Effect.provideService(EnvFiles, envFiles)),
    );
    state.started.previewServer = true;
  } else if (!enabled && state.previewServerService !== null) {
    const service = state.previewServerService;
    state.previewServerService = null;
    state.started.previewServer = false;
    yield* Fiber.interrupt(service.fiber);
  }
});

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
      previewServerService: null,
      projects: {},
      projectsInitialized: null,
      services: new Map(),
      started: {
        previewServer: false,
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

export function getConfigSync(): LiqvidConfig {
  const { config: $config } = getServerState();
  if (!Option.isSome($config)) {
    throw new Error("Server not initialized: config is not loaded");
  }

  return $config.value;
}
