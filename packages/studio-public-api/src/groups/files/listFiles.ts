import { Schema } from "effect";
import { HttpApiEndpoint, OpenApi } from "effect/unstable/httpapi";

import { InternalServerError, Unauthorized } from "../../errors.ts";

export const File = Schema.Struct({
  key: Schema.String,
  lastModified: Schema.String,
  size: Schema.Number,
});

export const ListFilesResponse = Schema.Struct({
  files: Schema.Array(File),
  nextCursor: Schema.NullOr(Schema.String),
  truncated: Schema.Boolean,
});

export const listFiles = HttpApiEndpoint.get("list", "/files", {
  error: [Unauthorized, InternalServerError],
  query: {
    cursor: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.String),
    prefix: Schema.optional(Schema.String),
  },
  success: ListFilesResponse,
}).annotate(OpenApi.Summary, "List user's files");
