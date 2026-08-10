import { Schema } from "effect";

import { LoggableJobClient, StructuredLog } from "../../../api/schemas.mts";

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
    job: LoggableJobClient,
  }),
  type: Schema.Literal("newJob"),
}).pipe(
  Schema.annotate({ description: "Message sent when a new job is created" }),
);

export type NewJobMessage = (typeof NewJobMessage)["Type"];

/**
 * Message sent when a job's state or logs change (e.g. it completes, fails, or
 * is cancelled).
 */
export const UpdateJobMessage = Schema.Struct({
  data: Schema.Struct({
    job: LoggableJobClient,
  }),
  type: Schema.Literal("updateJob"),
}).pipe(Schema.annotate({ description: "Message sent when a job is updated" }));

export type UpdateJobMessage = (typeof UpdateJobMessage)["Type"];

/**
 * Message sent when a new log entry is appended to a running job. Streaming
 * individual entries (rather than the whole job) keeps real-time log updates
 * cheap for verbose jobs.
 */
export const AppendLogMessage = Schema.Struct({
  data: Schema.Struct({
    /** ID of the job the log belongs to */
    id: Schema.String,

    /** The newly appended log entry */
    log: StructuredLog,
  }),
  type: Schema.Literal("appendLog"),
}).pipe(
  Schema.annotate({ description: "Message sent when a job log is appended" }),
);

export type AppendLogMessage = (typeof AppendLogMessage)["Encoded"];

/* ------------------------------ export ------------------------------ */
export const JobMessage = Schema.Union([
  AppendLogMessage,
  DeleteJobMessage,
  NewJobMessage,
  UpdateJobMessage,
]);

export type JobMessage = (typeof JobMessage)["Encoded"];
