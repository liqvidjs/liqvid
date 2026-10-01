import { Schema } from "effect";
import { HttpApiEndpoint, OpenApi } from "effect/http-api";

import { InternalServerError, Unauthorized } from "../../errors.ts";

import { Keys } from "./_utils.ts";

export const DeleteRequest = Schema.Struct({
  keys: Keys(1000, "Maximum 1000 keys per request"),
});

export const DeleteResponse = Schema.Struct({
  deleted: Schema.Array(Schema.String),
  errors: Schema.Array(
    Schema.Struct({
      code: Schema.String,
      key: Schema.String,
      message: Schema.String,
    }),
  ),
});

export const deleteFiles = HttpApiEndpoint.delete("delete", "/files", {
  error: [Unauthorized, InternalServerError],
  payload: DeleteRequest,
  success: DeleteResponse,
}).annotate(OpenApi.Summary, "Delete a batch of files");
