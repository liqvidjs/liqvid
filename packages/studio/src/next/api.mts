import * as url from "node:url";

import { StatusCodes } from "http-status-codes";

import {
  listRecordingsOperation,
  saveRecordingOperation,
  setProjectMetaOperation,
  staticFileOperation,
} from "../api/contract.mts";
import { setProjectMeta } from "../api/project-meta.mts";
import { listRecordings, saveRecording } from "../api/recording.mts";
import { getRoot } from "../api/root.mts";
import { serveStaticFile } from "../api/static-file.mts";
import { initializeServer } from "../initialize.mts";

interface RequestContext {
  params: Promise<{
    [key: string]: string[];
  }>;
}

/**
 * Liqvid server GET handler
 */
export async function GET(req: Request, { params }: RequestContext) {
  const paramsObject = await params;
  const keys = Object.keys(paramsObject);
  const routeParams = keys.length === 1 ? paramsObject[keys[0]!]! : [];

  const route = "/" + routeParams.join("/");

  const { search } = url.parse(req.url, true);

  const searchParams = new URLSearchParams(search ?? "");

  await initializeServer();

  switch (route) {
    case "/":
      return getRoot();
    case listRecordingsOperation.endpoint:
      return listRecordings(searchParams);
    case staticFileOperation.endpoint:
      return serveStaticFile(searchParams);
  }

  return Response.json(
    { error: "not_found" },
    { status: StatusCodes.NOT_FOUND },
  );
}

/**
 * Liqvid server POST handler
 */
export async function POST(req: Request, { params }: RequestContext) {
  const paramsObject = await params;
  const keys = Object.keys(paramsObject);
  const routeParams = keys.length === 1 ? paramsObject[keys[0]!]! : [];

  const route = "/" + routeParams.join("/");

  const { search } = url.parse(req.url, true);

  const searchParams = new URLSearchParams(search ?? "");

  await initializeServer();

  switch (route) {
    case setProjectMetaOperation.endpoint:
      return setProjectMeta(searchParams, await req.json());
    case saveRecordingOperation.endpoint:
      return saveRecording(searchParams, await req.formData());
  }

  return Response.json(
    { error: "not_found" },
    { status: StatusCodes.NOT_FOUND },
  );
}
