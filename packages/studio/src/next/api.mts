import {
  NodeFileSystem,
  NodeHttpPlatform,
  NodeServices,
} from "@effect/platform-node";
import { loadEnvFiles } from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas";
import {
  Cause,
  Effect,
  Exit,
  type FileSystem,
  Layer,
  Logger,
  References,
} from "effect";
import { Etag } from "effect/unstable/http";
import { toWebHandler } from "effect/unstable/http/HttpRouter";
import { HttpApiBuilder, HttpApiSwagger } from "effect/unstable/httpapi";
import { RelativeFile } from "effect-paths";
import { StatusCodes } from "http-status-codes";

import { audioLive } from "../api/audio.mts";
import { captionsLive } from "../api/captions.mts";
import { WebApi } from "../api/contract.mts";
import { projectMetaLive } from "../api/project-meta.mts";
import {
  DynamicImports,
  type DynamicImports as DynamicImportsType,
  recordingsLive,
} from "../api/recording.mts";
import { rendersLive } from "../api/renders.mts";
import { getRoot } from "../api/root.mts";
import { screenshotsLive } from "../api/screenshots.mts";
import { settingsLive } from "../api/settings.mts";
import { serveStaticFile } from "../api/static-file.mts";
import { thumbsLive } from "../api/thumbs.mts";
import { getServerState, initializeServer } from "../initialize.mts";
import { getLogLevel } from "../utils/misc.mts";

interface RequestContext {
  params: Promise<{
    [key: string]: string[];
  }>;
}

// Re-export for backwards compatibility
export type { DynamicImportsType as DynamicImports };

/**
 * Liqvid server GET handler
 */
export function getHandler(dynamicImports: DynamicImportsType) {
  const handler = createWebApiHandler(dynamicImports);

  return async function GET(req: Request, { params }: RequestContext) {
    const paramsObject = await params;
    const keys = Object.keys(paramsObject);
    const routeParams = keys.length === 1 ? paramsObject[keys[0]!]! : [];

    const route = "/" + routeParams.join("/");

    await initializeServer();

    let program:
      | Effect.Effect<unknown, unknown, EnvFiles | FileSystem.FileSystem>
      | undefined;

    switch (route) {
      // display server state for debugging
      case "/":
        program = getRoot();
        break;

      // WebSockets
      case "/ws": {
        const headers = new Headers();
        headers.set("Connection", "Upgrade");
        headers.set("Upgrade", "websocket");
        return new Response("Upgrade Required", {
          headers,
          status: StatusCodes.UPGRADE_REQUIRED,
        });
      }
    }

    if (route.startsWith("/static")) {
      const url = RelativeFile(route.slice("/static".length));
      program = serveStaticFile(url);
    }

    if (program) {
      return runEffect(program);
    }

    return handler(req);
  };
}

/**
 * Liqvid server POST handler
 */
export function postHandler(dynamicImports: DynamicImportsType) {
  const handler = createWebApiHandler(dynamicImports);

  return async function POST(
    req: Request,
    _ctx: RequestContext,
  ): Promise<Response> {
    await initializeServer();
    return handler(req);
  };
}

/**
 * Liqvid server DELETE handler
 */
export function deleteHandler(dynamicImports: DynamicImportsType) {
  const handler = createWebApiHandler(dynamicImports);

  return async function DELETE(req: Request, _ctx: RequestContext) {
    await initializeServer();
    return handler(req);
  };
}

/**
 * Liqvid server PUT handler
 */
export function putHandler(dynamicImports: DynamicImportsType) {
  const handler = createWebApiHandler(dynamicImports);

  return async function PUT(req: Request, _ctx: RequestContext) {
    await initializeServer();
    return handler(req);
  };
}

/**
 * Liqvid server PATCH handler
 */
export function patchHandler(dynamicImports: DynamicImportsType) {
  const handler = createWebApiHandler(dynamicImports);

  return async function PATCH(req: Request, _ctx: RequestContext) {
    await initializeServer();
    return handler(req);
  };
}

export { upgradeHandler } from "./websockets.mts";

async function runEffect<A, E>(
  program: Effect.Effect<A, E, FileSystem.FileSystem | EnvFiles>,
) {
  const { cwd } = getServerState();
  const result = await Effect.runPromiseExit(
    program.pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeFileSystem.layer,
          Logger.layer([Logger.consolePretty()]),
        ),
      ),
      Effect.provideService(References.MinimumLogLevel, getLogLevel()),
      Effect.provideService(EnvFiles, loadEnvFiles(cwd)),
      Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
    ),
  );

  return Exit.match(result, {
    onFailure: () =>
      Response.json(
        { error: "Internal Server Error" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      ),
    onSuccess: (v) => {
      if (v instanceof Response) {
        return v;
      }

      return Response.json(v);
    },
  });
}

/**
 * Create the web handler for the Effect `HttpApi`.
 *
 * The API is assembled from the endpoint definitions in `contract.mts`,
 * the group implementations (e.g. `screenshotsLive`), and the Node platform
 * services required to run it.
 *
 * The handler is memoized so that the same `dynamicImports` object returns
 * the same handler instance.
 */
const handlerCache = new WeakMap<
  DynamicImportsType,
  (request: Request) => Promise<Response>
>();

function createWebApiHandler(
  dynamicImports: DynamicImportsType,
): (request: Request) => Promise<Response> {
  const cached = handlerCache.get(dynamicImports);
  if (cached) return cached;

  const apiLive = HttpApiBuilder.layer(WebApi).pipe(
    Layer.provide([
      audioLive,
      captionsLive,
      projectMetaLive,
      recordingsLive,
      rendersLive,
      screenshotsLive,
      settingsLive,
      thumbsLive,
    ]),
    Layer.provide([NodeServices.layer, NodeHttpPlatform.layer, Etag.layerWeak]),
    Layer.provideMerge(NodeFileSystem.layer),
    Layer.provide(
      Logger.layer([Logger.consolePretty({ colors: true, mode: "tty" })]),
    ),
    Layer.provideMerge(
      Layer.succeed(References.MinimumLogLevel, getLogLevel()),
    ),
    // Provide DynamicImports service
    Layer.provideMerge(Layer.succeed(DynamicImports, dynamicImports)),
  );

  const appLive = Layer.mergeAll(
    apiLive,
    HttpApiSwagger.layer(WebApi, { path: "/api/liqvid/docs" }),
  );

  const { handler } = toWebHandler(appLive);
  // The handler only requires Request when all dependencies are provided via layers
  const typedHandler = handler as (request: Request) => Promise<Response>;
  handlerCache.set(dynamicImports, typedHandler);
  return typedHandler;
}
