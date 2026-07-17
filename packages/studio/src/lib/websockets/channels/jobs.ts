import { Schema } from "effect";

import { LoggableJob } from "../../../api/schemas.mts";

/** Message sent when a job is deleted */
export const DeleteJobMessage = Schema.Struct({
  data: Schema.Struct({
    /** ID of the job that was deleted */
    id: Schema.String,
  }),
  type: Schema.Literal("deleteJob"),
}).pipe(Schema.annotate({ description: "Message sent when a job is deleted" }));

export type DeleteJobMessage = (typeof DeleteJobMessage)["Type"];

/** Message sent when a new job is created */
export const NewJobMessage = Schema.Struct({
  data: Schema.Struct({
    job: Schema.Struct({
      name: Schema.String,
    }),
  }),
  type: Schema.Literal("newJob"),
}).pipe(
  Schema.annotate({ description: "Message sent when a new job is created" }),
);

export type NewJobMessage = (typeof NewJobMessage)["Type"];

export const UpdateJobMessage = Schema.Struct({
  data: Schema.Struct({
    job: LoggableJob,
  }),
  type: Schema.Literal("updateJob"),
}).pipe(Schema.annotate({ description: "Message sent when a job is updated" }));

export type UpdateJobMessage = (typeof UpdateJobMessage)["Type"];

/* ------------------------------ export ------------------------------ */
export const JobMessage = Schema.Union([
  DeleteJobMessage,
  NewJobMessage,
  UpdateJobMessage,
]);

export type JobMessage = (typeof JobMessage)["Type"];
