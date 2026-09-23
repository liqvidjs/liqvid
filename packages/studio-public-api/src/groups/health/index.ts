import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

export const HealthResponse = Schema.Struct({
  status: Schema.Literal("ok"),
});

export class Health extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("check", "/health", {
    success: HealthResponse,
  }),
) {}
