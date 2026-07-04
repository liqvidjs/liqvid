import path from "node:path";
import { fileURLToPath } from "node:url";

import { safeGet } from "@liqvid/fp";
import { Effect, FileSystem } from "effect";
import { StatusCodes } from "http-status-codes";

import { PROJECT_META_FILE } from "../conventions.mts";
import { HttpError } from "../utils/errors.mts";

import { setProjectMetaOperation } from "./contract.mts";

export function setProjectMeta(
  searchParams: URLSearchParams,
  rawBody: unknown,
) {
  return Effect.gen(function* () {
    const $url = safeGet(searchParams, "url");
    if ($url.isNone) {
      return yield* new HttpError({
        message: "missing url parameter",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const $body = setProjectMetaOperation.body.safeParse(rawBody);
    if (!$body.success) {
      return yield* new HttpError({
        message: "invalid body",
        status: StatusCodes.BAD_REQUEST,
      });
    }
    const body = $body.data;

    let projectPath = fileURLToPath($url.unwrap());
    if (projectPath.endsWith("page.tsx")) {
      projectPath = path.dirname(projectPath);
    }
    const assetsDir = path.join(projectPath, ".liqvid");
    const projectMetaFile = path.join(assetsDir, PROJECT_META_FILE);

    const fs = yield* FileSystem.FileSystem;

    // error if assets dir doesn't exist
    if (!(yield* fs.exists(assetsDir))) {
      return yield* new HttpError({
        message: "assets dir does not exist",
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    yield* fs.writeFileString(
      projectMetaFile,
      JSON.stringify({ duration: { milliseconds: body.durationMs } }, null, 2),
    );

    return new Response(null, {
      status: StatusCodes.NO_CONTENT,
    });
  });
}
