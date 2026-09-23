import {
  AspectRatio,
  SchemaProjectId,
  SchemaWorkspaceId,
} from "@liqvid/schemas";
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";

import { Authorization } from "../../authorization.ts";
import { InternalServerError, NotFound, Unauthorized } from "../../errors.ts";

export const ProjectRequest = Schema.Struct({
  aspectRatio: AspectRatio,
  description: Schema.optional(Schema.Unknown),
  name: Schema.String,
  parameters: Schema.optional(
    Schema.Record(Schema.String, Schema.Array(Schema.String)),
  ),
  path: Schema.String,

  /** ID of the Liqvid workspace to associate with this project */
  workspaceId: SchemaWorkspaceId.pipe(
    Schema.annotate({
      description: "ID of the Liqvid workspace to associate with this project",
    }),
  ),
});

export type ProjectRequest = typeof ProjectRequest.Type;

export const ProjectResponse = Schema.Struct({
  projectId: SchemaProjectId,
});

export type ProjectResponse = typeof ProjectResponse.Type;

export class Projects extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.post("create", "/api/v1/projects", {
      error: [Unauthorized, InternalServerError],
      payload: ProjectRequest,
      success: ProjectResponse.pipe(HttpApiSchema.status(201)),
    }).annotate(OpenApi.Summary, "Create a project"),
    HttpApiEndpoint.put("sync", "/api/v1/projects/:projectId", {
      error: [Unauthorized, NotFound, InternalServerError],
      params: { projectId: SchemaProjectId },
      payload: ProjectRequest,
      success: ProjectResponse,
    }).annotate(OpenApi.Summary, "Sync an existing project"),
  )
  .middleware(Authorization) {}
