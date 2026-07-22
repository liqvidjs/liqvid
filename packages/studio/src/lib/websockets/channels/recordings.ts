import { RecordingMeta } from "@liqvid/schemas";
import { Schema } from "effect";

/**
 * Message sent when a new recording is saved to disk.
 *
 * `url` is the `file://` URL of the owning project's `page.tsx`, matching the
 * `projectPath` the recording dialog is scoped to, so the client can ignore
 * recordings that belong to other projects.
 */
export const NewRecordingMessage = Schema.Struct({
  data: Schema.Struct({
    recording: RecordingMeta,
    url: Schema.String,
  }),
  type: Schema.Literal("newRecording"),
}).pipe(
  Schema.annotate({ description: "Message sent when a recording is created" }),
);

export type NewRecordingMessage = (typeof NewRecordingMessage)["Type"];

/** Message sent when an existing recording's metadata changes. */
export const UpdateRecordingMessage = Schema.Struct({
  data: Schema.Struct({
    recording: RecordingMeta,
    url: Schema.String,
  }),
  type: Schema.Literal("updateRecording"),
}).pipe(
  Schema.annotate({ description: "Message sent when a recording is updated" }),
);

export type UpdateRecordingMessage = (typeof UpdateRecordingMessage)["Type"];

/** Message sent when a recording is deleted from disk. */
export const DeleteRecordingMessage = Schema.Struct({
  data: Schema.Struct({
    /** Name (directory) of the recording that was deleted */
    name: Schema.String,
    url: Schema.String,
  }),
  type: Schema.Literal("deleteRecording"),
}).pipe(
  Schema.annotate({ description: "Message sent when a recording is deleted" }),
);

export type DeleteRecordingMessage = (typeof DeleteRecordingMessage)["Type"];

/* ------------------------------ export ------------------------------ */
export const RecordingMessage = Schema.Union([
  DeleteRecordingMessage,
  NewRecordingMessage,
  UpdateRecordingMessage,
]);

export type RecordingMessage = (typeof RecordingMessage)["Type"];
