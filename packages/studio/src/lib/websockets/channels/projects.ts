import { ProjectMeta } from "@liqvid/schemas/effect";
import { Schema } from "effect";

/** Message sent when a project is delete */
export const DeleteProjectMessage = Schema.Struct({
  data: Schema.Struct({
    /** ID of the project that was deleted */
    path: Schema.String,
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
  UpdateProjectMessage,
]);
