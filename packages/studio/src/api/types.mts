import { Schema } from "effect";

export const SaveRecordingMetadata = Schema.Struct({
  /** duration */
  durationMs: Schema.Number,
  plugins: Schema.Array(
    Schema.Struct({
      filename: Schema.optional(Schema.String),
      isBlob: Schema.Boolean,
      key: Schema.String,
    }),
  ),
});

export type SaveRecordingMetadata = (typeof SaveRecordingMetadata)["Type"];

export const SaveRecordingMetadataFromJson = Schema.fromJsonString(
  SaveRecordingMetadata,
);
