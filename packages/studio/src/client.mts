import { Err, Ok, type Result } from "@liqvid/fp";
import { ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import { WebApi } from "./api/contract.mts";
import { saveRecordingOperation } from "./api/contract-legacy.mts";

const apiRoot = "/api/liqvid";

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

// Bundle the browser/native fetch client layer
export const clientRuntime = ManagedRuntime.make(FetchHttpClient.layer);

/**
 * Client to call the Liqvid Studio web API.
 * Use with Effect.
 */
export const LiqvidStudioApiClient = HttpApiClient.make(WebApi);
