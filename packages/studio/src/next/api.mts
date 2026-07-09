import * as url from "node:url";

import {
  NodeFileSystem,
  NodeHttpPlatform,
  NodeServices,
} from "@effect/platform-node";
import { FileDecodeError, loadEnvFiles } from "@liqvid/cli/utils";
import { EnvFiles } from "@liqvid/schemas/effect";
import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import chalk from "chalk";
import { Effect, Exit, type FileSystem, Layer } from "effect";
import { Etag } from "effect/unstable/http";
import { toWebHandler } from "effect/unstable/http/HttpRouter";
import { HttpApiBuilder, HttpApiSwagger } from "effect/unstable/httpapi";
import { StatusCodes } from "http-status-codes";
import { notFound } from "next/navigation";

import { captionsLive, generateCaptions } from "../api/captions.mts";
import {
  generateCaptionsOperation,
  listRendersOperation,
  renameRenderOperation,
  saveRecordingOperation,
  startRenderOperation,
  staticFileOperation,
} from "../api/contract.mts";
import { WebApi } from "../api/contract-effect.mts";
import { patchDependencies } from "../api/patch-dependencies.mts";
import { projectMetaLive } from "../api/project-meta.mts";
import { recordingsLive, saveRecording } from "../api/recording.mts";
import { listRenders, renameRender, startRender } from "../api/renders.mts";
import { getRoot } from "../api/root.mts";
import { screenshotsLive } from "../api/screenshots.mts";
import { serveStaticFile } from "../api/static-file.mts";
import { thumbsLive } from "../api/thumbs.mts";
import { initializeServer } from "../initialize.mts";

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
 * Web handler for the Effect `HttpApi`.
 *
 * The API is assembled from the endpoint definitions in `contract-effect.mts`,
 * the group implementations (e.g. `screenshotsLive`), and the Node platform
 * services required to run it. It is built once and reused across requests.
 */
const apiLive = HttpApiBuilder.layer(WebApi).pipe(
  Layer.provide([
    captionsLive,
    projectMetaLive,
    recordingsLive,
    screenshotsLive,
    thumbsLive,
  ]),
  Layer.provide([NodeServices.layer, NodeHttpPlatform.layer, Etag.layerWeak]),
  Layer.provideMerge(NodeFileSystem.layer),
);

const appLive = Layer.mergeAll(
  apiLive,
  HttpApiSwagger.layer(WebApi, { path: "/api/liqvid/docs" }), // Matches the Next.js catch-all base path below
);

const { handler: webApiHandler } = toWebHandler(appLive);

/**
 * Route paths (relative to the API base) served by the Effect `HttpApi`.
 *
 * Entries are matched exactly or as a path prefix (e.g. `/screenshots` also
 * matches `/screenshots/capture`). As routes are migrated to the `HttpApi`, add
 * their paths here so the legacy switch-based router delegates to the new
 * handler.
 */
const effectApiRoutePrefixes = [
  "/captions",
  "/recordings",
  "/screenshots",
  "/thumbs",
  "/thumbs/generate",
];

/** Whether a given route should be handled by the Effect `HttpApi`. */
function isEffectApiRoute(route: string): boolean {
  return (
    route.startsWith("/docs") ||
    effectApiRoutePrefixes.some(
      (prefix) => route === prefix || route.startsWith(prefix + "/"),
    )
  );
}

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

    // Routes that have been migrated to the Effect `HttpApi` are delegated to
    // the generated web handler.
    if (isEffectApiRoute(route)) {
      return webApiHandler(req);
    }

    const { search } = new URL(req.url);

    const searchParams = new URLSearchParams(search ?? "");

    let program:
      | Effect.Effect<unknown, any, EnvFiles | FileSystem.FileSystem>
      | undefined;

    switch (route) {
      case "/":
        program = getRoot();
        break;

      case "/patch":
        program = patchDependencies();
        break;

      case listRendersOperation.endpoint:
        program = listRenders(searchParams);
        break;
    }

    if (!program && route.startsWith(staticFileOperation.endpoint)) {
      const url = route.slice(staticFileOperation.endpoint.length);
      program = serveStaticFile(url);
    }

    if (program) {
      return runEffect(program);
    }

    return Response.json(
      { error: "not_found" },
      { status: StatusCodes.NOT_FOUND },
    );
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

    // Routes that have been migrated to the Effect `HttpApi` are delegated to
    // the generated web handler.
    if (isEffectApiRoute(route)) {
      return webApiHandler(req);
    }

    const { search } = url.parse(req.url, true);

    const searchParams = new URLSearchParams(search ?? "");

    let program:
      | Effect.Effect<unknown, unknown, FileSystem.FileSystem>
      | undefined;

    switch (route) {
      case generateCaptionsOperation.endpoint:
        program = generateCaptions(searchParams);
        break;

      // case generateThumbsOperation.endpoint: {
      //   program = generateThumbs(searchParams, await req.json());
      //   break;
      // }

      // case setProjectMetaOperation.endpoint:
      //   program = setProjectMeta(searchParams, await req.json());
      //   break;

      case saveRecordingOperation.endpoint:
        program = saveRecording(
          searchParams,
          await req.formData(),
          dynamicImports,
        );
        break;

      case startRenderOperation.endpoint:
        program = startRender(searchParams, await req.json());
        break;

      case renameRenderOperation.endpoint:
        program = renameRender(searchParams, await req.json());
        break;
    }

    if (program) {
      return runEffect(program);
    }

    return Response.json(
      { error: "not_found" },
      { status: StatusCodes.NOT_FOUND },
    );
  };
}

/* -------------------- unsupported methods -------------------- */

/**
 * Liqvid server DELETE handler
 */
export function deleteHandler(_dynamicImports: DynamicImports) {
  return async function DELETE(req: Request, { params }: RequestContext) {
    const paramsObject = await params;
    const keys = Object.keys(paramsObject);
    const routeParams = keys.length === 1 ? paramsObject[keys[0]!]! : [];

    const route = "/" + routeParams.join("/");

    await initializeServer();

    // Routes that have been migrated to the Effect `HttpApi` are delegated to
    // the generated web handler.
    if (isEffectApiRoute(route)) {
      return webApiHandler(req);
    }

    notFound();
  };
}

/**
 * Liqvid server PUT handler
 */
export function putHandler(_dynamicImports: DynamicImports) {
  return async function PUT(_req: Request, _ctx: RequestContext) {
    notFound();
  };
}

/**
 * Liqvid server PATCH handler
 */
export function patchHandler(_dynamicImports: DynamicImports) {
  return async function PATCH(_req: Request, _ctx: RequestContext) {
    notFound();
  };
}

async function runEffect<A, E>(
  program: Effect.Effect<A, E, FileSystem.FileSystem | EnvFiles>,
) {
  const result = await Effect.runPromiseExit(
    program.pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provideService(EnvFiles, loadEnvFiles(process.cwd())),
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
        if (error instanceof HttpError) {
          return Response.json(
            { error: error.message },
            { status: error.status },
          );
        } else if (error instanceof FileDecodeError) {
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
