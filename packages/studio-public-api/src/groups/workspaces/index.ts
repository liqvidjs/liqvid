import { SchemaWorkspaceId } from "@liqvid/schemas";
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authorization } from "../../authorization.ts";
import { InternalServerError, Unauthorized } from "../../errors.ts";

export const WorkspaceRequest = Schema.Struct({
  name: Schema.String,
});

export const WorkspaceResponse = Schema.Struct({
  workspaceId: SchemaWorkspaceId,
});

export class Workspaces extends HttpApiGroup.make("workspaces")
  .add(
    HttpApiEndpoint.post("create", "/", {
      error: [Unauthorized, InternalServerError],
      payload: WorkspaceRequest,
      success: WorkspaceResponse.pipe(HttpApiSchema.status(201)),
    }).annotate(OpenApi.Summary, "Create a workspace"),
  )
  .prefix("/workspaces")
  .middleware(Authorization) {}
