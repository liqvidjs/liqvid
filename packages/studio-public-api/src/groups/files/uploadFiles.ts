import { Schema } from "effect";
import { HttpApiEndpoint, OpenApi } from "effect/unstable/httpapi";

import { InternalServerError, Unauthorized } from "../../errors.ts";

import { Keys } from "./_utils.ts";

export const UploadRequest = Schema.Struct({
  keys: Keys(1000, "Maximum 1000 keys per request"),

  /** ID of the workspace the file will be uploaded to. */
  workspaceId: Schema.String.pipe(
    Schema.annotate({
      description: "ID of the workspace the file will be uploaded to.",
    }),
  ),
});

export const Upload = Schema.Struct({
  key: Schema.String,

  url: Schema.String,
});

export const UploadResponse = Schema.Struct({
  expiresIn: Schema.Number,
  uploads: Schema.Array(Upload),
});

export const uploadFiles = HttpApiEndpoint.post("upload", "/api/v1/files", {
  error: [Unauthorized, InternalServerError],
  payload: UploadRequest,
  success: UploadResponse,
}).annotate(OpenApi.Summary, "Get upload URLs for a batch of files");
