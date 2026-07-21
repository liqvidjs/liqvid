import * as url from "node:url";

import {
  NodeFileSystem,
  NodeHttpPlatform,
  NodeServices,
} from "@effect/platform-node";
import { FileDecodeError, loadEnvFiles } from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas";
import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import chalk from "chalk";
import {
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
import { StatusCodes } from "http-status-codes";

import { audioLive } from "../api/audio.mts";
import { captionsLive } from "../api/captions.mts";
import { WebApi } from "../api/contract.mts";
import { projectMetaLive } from "../api/project-meta.mts";
import { recordingsLive, saveRecording } from "../api/recording.mts";
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

export type DynamicImports = Record<
  string,
  () => Promise<
    {
      default?: LiqvidStudioServerPlugin;
    } & LiqvidStudioServerPlugin
  >
>;

/**
 * Liqvid server GET handler
 */
export function getHandler(_dynamicImports: DynamicImports) {
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
      const url = route.slice("/static".length);
      program = serveStaticFile(url);
    }

    if (program) {
      return runEffect(program);
    }

    return webApiHandler(req);
  };
}

/**
 * Liqvid server POST handler
 */
export function postHandler(dynamicImports: DynamicImports) {
  return async function POST(
    req: Request,
    { params }: RequestContext,
  ): Promise<Response> {
    const paramsObject = await params;
    const keys = Object.keys(paramsObject);
    const routeParams = keys.length === 1 ? paramsObject[keys[0]!]! : [];

    const route = "/" + routeParams.join("/");

    await initializeServer();

    const { search } = url.parse(req.url, true);

    if (route === "/recordings") {
      const searchParams = new URLSearchParams(search ?? "");

      return runEffect(
        saveRecording(searchParams, await req.formData(), dynamicImports),
      );
    }

    return webApiHandler(req);
  };
}

/**
 * Liqvid server DELETE handler
 */
export function deleteHandler(_dynamicImports: DynamicImports) {
  return async function DELETE(req: Request, _ctx: RequestContext) {
    await initializeServer();
    return webApiHandler(req);
  };
}

/**
 * Liqvid server PUT handler
 */
export function putHandler(_dynamicImports: DynamicImports) {
  return async function PUT(req: Request, _ctx: RequestContext) {
    await initializeServer();
    return webApiHandler(req);
  };
}

/**
 * Liqvid server PATCH handler
 */
export function patchHandler(_dynamicImports: DynamicImports) {
  return async function PATCH(req: Request, _ctx: RequestContext) {
    await initializeServer();
    return webApiHandler(req);
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
    ),
  );

  return Exit.match(result, {
    onFailure: (cause) => {
      for (const reason of cause.reasons) {
        // all other errors are 500
        if (reason._tag !== "Fail") {
          console.error(reason);
          break;
        }

        const { error } = reason;

        // HTTP errors, expected
        if (error instanceof FileDecodeError) {
          console.error(
            chalk.red(`FileDecodeError in ${error.filename}: ${error.cause}`),
          );
        } else {
          console.error(error);
        }

        break;
      }

      // other error, 500
      return Response.json(
        { error: "Internal Server Error" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      );
    },
    onSuccess: (v) => {
      if (v instanceof Response) {
        return v;
      }

      return Response.json(v);
    },
  });
}

/**
 * Web handler for the Effect `HttpApi`.
 *
 * The API is assembled from the endpoint definitions in `contract-effect.mts`,
 * the group implementations (e.g. `screenshotsLive`), and the Node platform
 * services required to run it. It is built once and reused across requests.
 */
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
  Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, getLogLevel())),
);

const appLive = Layer.mergeAll(
  apiLive,
  HttpApiSwagger.layer(WebApi, { path: "/api/liqvid/docs" }), // Matches the Next.js catch-all base path below
);

const { handler: webApiHandler } = toWebHandler(appLive);
