import { Schema } from "effect";
import { SchemaRelativeFile } from "effect-paths";

export const SaveRecordingMetadata = Schema.Struct({
  /** duration */
  durationMs: Schema.Number,

  /**
   * Parameter values for parameterized projects.
   * e.g., `{ lang: "en", locale: "US" }`
   */
  params: Schema.Record(Schema.String, Schema.String).pipe(Schema.optional),

  plugins: Schema.Array(
    Schema.Struct({
      filename: SchemaRelativeFile.pipe(Schema.optional),
      isBlob: Schema.Boolean,
      key: Schema.String,
    }),
  ),
});

export type SaveRecordingMetadata = (typeof SaveRecordingMetadata)["Type"];

export const SaveRecordingMetadataFromJson = Schema.fromJsonString(
  SaveRecordingMetadata,
);
