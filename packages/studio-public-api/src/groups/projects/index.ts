import {
  AspectRatio,
  Parametrized,
  SchemaProjectId,
  SchemaWorkspaceId,
} from "@liqvid/schemas";
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authorization } from "../../authorization.ts";
import { InternalServerError, NotFound, Unauthorized } from "../../errors.ts";

export const ProjectRequest = Schema.Struct({
  aspectRatio: AspectRatio,

  description: Parametrized(Schema.String).pipe(Schema.optional),

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
    HttpApiEndpoint.post("create", "/", {
      error: [Unauthorized, InternalServerError],
      payload: ProjectRequest,
      success: ProjectResponse.pipe(HttpApiSchema.status(201)),
    }).annotate(OpenApi.Summary, "Create a project"),
    HttpApiEndpoint.put("sync", "/:projectId", {
      error: [Unauthorized, NotFound, InternalServerError],
      params: { projectId: SchemaProjectId },
      payload: ProjectRequest,
      success: ProjectResponse,
    }).annotate(OpenApi.Summary, "Sync an existing project"),
    HttpApiEndpoint.delete("delete", "/:projectId", {
      error: [Unauthorized, NotFound, InternalServerError],
      params: { projectId: SchemaProjectId },
      success: ProjectResponse,
    }).annotate(OpenApi.Summary, "Unpublish a project"),
  )
  .prefix("/projects")
  .annotate(OpenApi.Title, "Projects")
  .middleware(Authorization) {}
