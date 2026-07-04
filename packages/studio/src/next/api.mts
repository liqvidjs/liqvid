import * as url from "node:url";

import { NodeFileSystem } from "@effect/platform-node";
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
      | Effect.Effect<unknown, HttpError | unknown, FileSystem.FileSystem>
      | undefined;

    switch (route) {
      case "/":
        return getRoot();

      case listCaptionsOperation.endpoint:
        program = listCaptions(searchParams);
        break;

      case listRecordingsOperation.endpoint:
        return listRecordings(searchParams);

      case listRendersOperation.endpoint:
        return listRenders(searchParams);

      case listScreenshotsOperation.endpoint:
        program = handleListScreenshots(req);
        break;

      case listThumbsOperation.endpoint: {
        program = listThumbs(searchParams);
        break;
      }
    }

    if (program) {
      return runEffect(program);
    }

    if (route.startsWith(staticFileOperation.endpoint)) {
      const url = route.slice(staticFileOperation.endpoint.length);
      return serveStaticFile(url);
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
        return generateCaptions(searchParams);

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
        return startRender(searchParams, await req.json());

      case renameRenderOperation.endpoint:
        return renameRender(searchParams, await req.json());
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
  program: Effect.Effect<A, E, FileSystem.FileSystem>,
) {
  const result = await Effect.runPromiseExit(
    program.pipe(Effect.provide(NodeFileSystem.layer)),
  );

  return Exit.match(result, {
    onFailure: (cause) => {
      for (const reason of cause.reasons) {
        // all other errors are 500
        if (reason._tag !== "Fail") {
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
            chalk.red(
              `FileDecodeError in ${error.filename}: ${error.cause.message}`,
            ),
          );
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
      console.log("Effect succeeded with value:", v, v instanceof Response);
      if (v instanceof Response) {
        return v;
      }

      return Response.json(v);
    },
  });
}
