import { Schema } from "effect";

export const RecordingMetaFile = Schema.Struct({
  // TODO: enforce date format
  created: Schema.String,
  duration: Schema.Struct({
    milliseconds: Schema.Number,
  }),
});
export type RecordingMetaFile = (typeof RecordingMetaFile)["Type"];

export const RecordingMeta = Schema.Struct({
  ...RecordingMetaFile.fields,
  name: Schema.String,
  plugins: Schema.Array(Schema.String),
});
export type RecordingMeta = (typeof RecordingMeta)["Type"];
