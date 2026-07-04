import * as url from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
import { EnvFiles } from "@liqvid/schemas/effect";
import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import chalk from "chalk";
import { Effect, Exit, type FileSystem } from "effect";
import { StatusCodes } from "http-status-codes";
import { notFound } from "next/navigation";

import { generateCaptions, listCaptions } from "../api/captions.mts";
import {
  captureScreenshotOperation,
  copyScreenshotOperation,
  generateCaptionsOperation,
  generateThumbsOperation,
  listCaptionsOperation,
  listRecordingsOperation,
  listRendersOperation,
  listScreenshotsOperation,
  listThumbsOperation,
  renameRenderOperation,
  saveRecordingOperation,
  setProjectMetaOperation,
  startRenderOperation,
  staticFileOperation,
} from "../api/contract.mts";
import { setProjectMeta } from "../api/project-meta.mts";
import { listRecordings, saveRecording } from "../api/recording.mts";
import { listRenders, renameRender, startRender } from "../api/renders.mts";
import { getRoot } from "../api/root.mts";
import {
  handleCaptureScreenshot,
  handleCopyScreenshot,
  handleListScreenshots,
} from "../api/screenshots.mts";
import { serveStaticFile } from "../api/static-file.mts";
import { generateThumbs, listThumbs } from "../api/thumbs.mts";
import { initializeServer } from "../initialize.mts";
import { loadEnvFiles } from "../jobs/preview-server.mts";
import { FileDecodeError, HttpError } from "../utils/errors.mts";

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

    const { search } = new URL(req.url);

    const searchParams = new URLSearchParams(search ?? "");

    await initializeServer();

    let program:
      | Effect.Effect<
          unknown,
          HttpError | unknown,
          EnvFiles | FileSystem.FileSystem
        >
      | undefined;

    switch (route) {
      case "/":
        program = getRoot();
        break;

      case listCaptionsOperation.endpoint:
        program = listCaptions(searchParams);
        break;

      case listRecordingsOperation.endpoint:
        program = listRecordings(searchParams);
        break;

      case listRendersOperation.endpoint:
        program = listRenders(searchParams);
        break;

      case listScreenshotsOperation.endpoint:
        program = handleListScreenshots(req);
        break;

      case listThumbsOperation.endpoint: {
        program = listThumbs(searchParams);
        break;
      }
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

    const { search } = url.parse(req.url, true);

    const searchParams = new URLSearchParams(search ?? "");

    await initializeServer();

    let program:
      | Effect.Effect<unknown, HttpError | unknown, FileSystem.FileSystem>
      | undefined;

    switch (route) {
      case captureScreenshotOperation.endpoint:
        program = handleCaptureScreenshot(req);
        break;

      case copyScreenshotOperation.endpoint:
        program = handleCopyScreenshot(req);
        break;

      case generateCaptionsOperation.endpoint:
        program = generateCaptions(searchParams);
        break;

      case generateThumbsOperation.endpoint: {
        program = generateThumbs(searchParams, await req.json());
        break;
      }

      case setProjectMetaOperation.endpoint:
        program = setProjectMeta(searchParams, await req.json());
        break;

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
  return async function DELETE(_req: Request, _ctx: RequestContext) {
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
