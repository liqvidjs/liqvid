import { Schema } from "effect";

/**
 * Captions metadata.
 */
export const CaptionsMeta = Schema.Struct({
  /** Path to the captions.vtt file */
  captionsPath: Schema.String,

  /** Timestamp when captions were generated */
  createdAt: Schema.String,

  /** Generation status */
  status: Schema.Literals(["pending", "generating", "completed", "failed"]),

  /** Path to the transcript.json file */
  transcriptPath: Schema.optional(Schema.String),
});

export type CaptionsMeta = (typeof CaptionsMeta)["Type"];

export const CaptionsMetaFromJson = Schema.fromJsonString(CaptionsMeta);

export const TranscriptWord = Schema.Tuple([
  Schema.String,
  Schema.Number,
  Schema.Number,
]);

export type TranscriptWord = (typeof TranscriptWord)["Type"];

export const Transcript = Schema.Array(TranscriptWord);

export type Transcript = (typeof Transcript)["Type"];
