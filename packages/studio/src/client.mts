/** biome-ignore-all lint/complexity/noBannedTypes: intersection types */
/** biome-ignore-all lint/suspicious/noExplicitAny: heavy type magic here */
import { Err, Ok, type Result } from "have-fun";
import type { z } from "zod";

import {
  listRecordingsOperation,
  type Operation,
  saveRecordingOperation,
  setProjectMetaOperation,
} from "./api/contract.mts";
import { fetchJson } from "./utils/dom.mts";

const apiRoot = "/api/liqvid";

function makeFetcher<
  BodyModel extends z.ZodType,
  ErrorModel extends z.ZodType,
  ResponseModel extends z.ZodType,
  SearchModel extends z.ZodType<Record<string, string>>,
  C extends Operation<BodyModel, ErrorModel, ResponseModel, SearchModel>,
>(
  config: C,
): (
  opts: (C["search"] extends z.ZodType<infer SearchOut>
    ? { search: SearchOut }
    : {}) &
    (C["body"] extends z.ZodType<infer BodyOut> ? { body: BodyOut } : {}),
) => Promise<
  Result<
    C["response"] extends z.ZodType<infer ResponseOut>
      ? ResponseOut
      : undefined,
    SyntaxError | TypeError | z.ZodError<z.core.output<ErrorModel>>
  >
> {
  const {
    endpoint,
    method = "GET",
    response: responseModel,
    search: searchModel,
  } = config;

  const init: RequestInit = { method };

  if (responseModel) {
    return async (opts) => {
      const queryString = searchModel
        ? "?" + new URLSearchParams((opts as any).search as any)
        : "";
      const url = apiRoot + endpoint + queryString;

      if (method === "POST" && (opts as any).body) {
        init.body = JSON.stringify((opts as any).body);
      }
      const $res = await fetchJson(responseModel, url, init);

      return $res as any;
    };
  }

  return async (opts) => {
    const queryString = searchModel
      ? "?" + new URLSearchParams((opts as any).search as any)
      : "";
    const url = apiRoot + endpoint + queryString;

    if (method === "POST" && (opts as any).body) {
      init.body = JSON.stringify((opts as any).body);
    }

    try {
      const res = await fetch(url, init);
      if (res.ok) {
        return Ok(undefined as any);
      }
      return Err(res.json());
    } catch (e) {
      return Err(e as TypeError);
    }
  };
}

export const listRecordings = makeFetcher(listRecordingsOperation);

export const setProjectMeta = makeFetcher(setProjectMetaOperation);

interface SaveRecordingOpts {
  search: { url: string };
  body: {
    durationMs: number;
    plugins: Array<{ key: string; data: unknown }>;
  };
}

/**
 * Determine filename for a Blob based on its MIME type.
 */
function getBlobFilename(blob: Blob): string {
  if (blob.type.startsWith("video/")) {
    return "video.webm";
  }
  if (blob.type.startsWith("audio/")) {
    return "audio.webm";
  }
  return "data.bin";
}

/**
 * Save recording data to the server.
 * Handles both JSON data and Blob data (for media recordings).
 */
export async function saveRecording(
  opts: SaveRecordingOpts,
): Promise<Result<undefined, TypeError>> {
  const { search, body } = opts;
  const queryString = "?" + new URLSearchParams(search);
  const url = apiRoot + saveRecordingOperation.endpoint + queryString;

  const formData = new FormData();

  // Add metadata
  const metadata = {
    durationMs: body.durationMs,
    plugins: body.plugins.map(({ key, data }) => ({
      filename: data instanceof Blob ? getBlobFilename(data) : undefined,
      isBlob: data instanceof Blob,
      key,
    })),
  };
  formData.append("metadata", JSON.stringify(metadata));

  // Add plugin data
  for (const { key, data } of body.plugins) {
    if (data instanceof Blob) {
      formData.append(key, data, getBlobFilename(data));
    } else {
      formData.append(key, JSON.stringify(data));
    }
  }

  try {
    const res = await fetch(url, {
      body: formData,
      method: "POST",
    });
    if (res.ok) {
      return Ok(undefined);
    }
    return Err(new TypeError(await res.text()));
  } catch (e) {
    return Err(e as TypeError);
  }
}
