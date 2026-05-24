import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { safeGet } from "@liqvid/fp";
import { StatusCodes } from "http-status-codes";

import { PROJECT_META_FILE } from "../conventions.mts";

import { setProjectMetaOperation } from "./contract.mts";

export async function setProjectMeta(
  searchParams: URLSearchParams,
  rawBody: unknown,
) {
  const $url = safeGet(searchParams, "url");
  if ($url.isNone) {
    return Response.json(
      { error: "invalid" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const $body = setProjectMetaOperation.body.safeParse(rawBody);
  if (!$body.success) {
    return Response.json(
      { error: "invalid" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }
  const body = $body.data;

  let projectPath = fileURLToPath($url.unwrap());
  if (projectPath.endsWith("page.tsx")) {
    projectPath = path.dirname(projectPath);
  }
  const assetsDir = path.join(projectPath, ".liqvid");
  const projectMetaFile = path.join(assetsDir, PROJECT_META_FILE);

  // error if assets dir doesn't exist
  if (!fs.existsSync(assetsDir)) {
    return Response.json(null, { status: StatusCodes.INTERNAL_SERVER_ERROR });
  }

  await fsp.writeFile(
    projectMetaFile,
    JSON.stringify({ duration: { milliseconds: body.durationMs } }, null, 2),
  );
  return new Response(null, {
    status: StatusCodes.NO_CONTENT,
  });
}
