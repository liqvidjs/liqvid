import { Schema } from "effect";
import { RelativeFile } from "effect-paths";

export const SaveRecordingMetadata = Schema.Struct({
  /** duration */
  durationMs: Schema.Number,
  plugins: Schema.Array(
    Schema.Struct({
      filename: Schema.String.pipe(
        Schema.fromBrand("RelativeFile", RelativeFile),
        Schema.optional,
      ),
      isBlob: Schema.Boolean,
      key: Schema.String,
    }),
  ),
});

export type SaveRecordingMetadata = (typeof SaveRecordingMetadata)["Type"];

export const SaveRecordingMetadataFromJson = Schema.fromJsonString(
  SaveRecordingMetadata,
);
