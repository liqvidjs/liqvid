import { SchemaUserId } from "@liqvid/schemas";
import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";

import { Authorization } from "../../authorization.ts";

export const IdentityResponse = Schema.Struct({
  userId: SchemaUserId,
});

export class Identity extends HttpApiGroup.make("identity")
  .add(
    HttpApiEndpoint.get("get", "/identity", {
      success: IdentityResponse,
    }),
  )
  .middleware(Authorization) {}
