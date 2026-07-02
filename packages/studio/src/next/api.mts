import * as url from "node:url";

import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
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

    switch (route) {
      case "/":
        return getRoot();

      case listCaptionsOperation.endpoint:
        return listCaptions(searchParams);

      case listRecordingsOperation.endpoint:
        return listRecordings(searchParams);

      case listRendersOperation.endpoint:
        return listRenders(searchParams);

      case listScreenshotsOperation.endpoint:
        return handleListScreenshots(req);

      case listThumbsOperation.endpoint:
        return listThumbs(searchParams);
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
  return async function POST(req: Request, { params }: RequestContext) {
    const paramsObject = await params;
    const keys = Object.keys(paramsObject);
    const routeParams = keys.length === 1 ? paramsObject[keys[0]!]! : [];

    const route = "/" + routeParams.join("/");

    const { search } = url.parse(req.url, true);

    const searchParams = new URLSearchParams(search ?? "");

    await initializeServer();

    switch (route) {
      case captureScreenshotOperation.endpoint:
        return handleCaptureScreenshot(req);

      case copyScreenshotOperation.endpoint:
        return handleCopyScreenshot(req);

      case generateCaptionsOperation.endpoint:
        return generateCaptions(searchParams /*await req.json()*/);

      case generateThumbsOperation.endpoint:
        return generateThumbs(searchParams, await req.json());

      case setProjectMetaOperation.endpoint:
        return setProjectMeta(searchParams, await req.json());

      case saveRecordingOperation.endpoint:
        return saveRecording(
          searchParams,
          await req.formData(),
          dynamicImports,
        );

      case startRenderOperation.endpoint:
        return startRender(searchParams, await req.json());

      case renameRenderOperation.endpoint:
        return renameRender(searchParams, await req.json());
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
