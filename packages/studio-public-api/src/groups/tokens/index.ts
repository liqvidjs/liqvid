import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import { InternalServerError } from "../../errors.ts";

export const RequestTokenResponse = Schema.Struct({
  authorizeUrl: Schema.String,
  expiresAt: Schema.DateTimeUtcFromString,
  requestId: Schema.String,
});

export type RequestTokenResponse = typeof RequestTokenResponse.Type;

export class Tokens extends HttpApiGroup.make("tokens").add(
  HttpApiEndpoint.post("create", "/tokens", {
    error: InternalServerError,
    success: RequestTokenResponse.pipe(HttpApiSchema.status(201)),
  }),
) {}
