import { ProjectMeta } from "@liqvid/schemas";
import { Schema } from "effect";
import { RelativeDir } from "effect-paths";

/** Message sent when a project is created */
export const NewProjectMessage = Schema.Struct({
  data: ProjectMeta,

  type: Schema.Literal("newProject"),
}).pipe(
  Schema.annotate({ description: "Message sent when a project is created" }),
);

/** Message sent when a project is deleted */
export const DeleteProjectMessage = Schema.Struct({
  data: Schema.Struct({
    /** ID of the project that was deleted */
    path: Schema.String.pipe(Schema.fromBrand("RelativeDir", RelativeDir)),
  }),
  type: Schema.Literal("deleteProject"),
}).pipe(
  Schema.annotate({ description: "Message sent when a project is deleted" }),
);

export type DeleteProjectMessage = (typeof DeleteProjectMessage)["Type"];

export const UpdateProjectMessage = Schema.Struct({
  data: ProjectMeta,

  type: Schema.Literal("updateProject"),
}).pipe(
  Schema.annotate({ description: "Message sent when a project is updated" }),
);

/* ------------------------------ export ------------------------------ */
export const ProjectMessage = Schema.Union([
  // project messages
  DeleteProjectMessage,
  NewProjectMessage,
  UpdateProjectMessage,
]);
