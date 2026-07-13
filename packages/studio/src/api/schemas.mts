import { ThumbnailsJob } from "@liqvid/schemas/effect";
import { Schema } from "effect";

import { CaptionsMeta } from "../types/schemas.mts";

/**
 * On-disk metadata for a single audio rendering (`audio-meta.json`).
 */
const AudioMetaBase = Schema.Struct({
  /** Timestamp when audio render was created */
  createdAt: Schema.String,

  /** MIME type of audio recording */
  mimeType: Schema.String,

  /** Name of audio recording */
  // name: Schema.String,
});

const AudioMetaFailed = AudioMetaBase.pipe(
  Schema.fieldsAssign({
    state: Schema.Literal("failed"),
  }),
);

const AudioMetaRunning = AudioMetaBase.pipe(
  Schema.fieldsAssign({
    state: Schema.Literal("running"),
  }),
);

const AudioMetaCompleted = AudioMetaBase.pipe(
  Schema.fieldsAssign({
    /** Duration in seconds */
    duration: Schema.Number,

    state: Schema.Literal("completed"),
  }),
);

export const AudioMeta = Schema.Union([
  AudioMetaCompleted,
  AudioMetaFailed,
  AudioMetaRunning,
]);

export type AudioMeta = (typeof AudioMeta)["Type"];

/**
 * An audio rendering as returned by the API: its id (folder name, or
 * `"default"` in single-audio mode), metadata, and any associated captions.
 */
export const AudioEntry = Schema.Struct({
  /** Captions for this audio recording, if any have been generated */
  captions: Schema.NullOr(CaptionsMeta),

  /** Folder name for the audio (or `"default"` in single-audio mode) */
  id: Schema.String,

  /** Audio metadata */
  meta: AudioMeta,
});

export type AudioEntry = (typeof AudioEntry)["Type"];

/**
 * Metadata for a render.
 */
export const RenderMeta = Schema.Struct({
  /** Color scheme used */
  colorScheme: Schema.Literals(["light", "dark"]),

  /** Timestamp when render was created */
  createdAt: Schema.String,

  /** Duration in seconds */
  duration: Schema.optional(Schema.Number),

  /** Frames per second */
  fps: Schema.Number,

  /** Video height */
  height: Schema.Number,

  /** Output filename */
  output: Schema.String,

  /** Render status */
  status: Schema.Literals(["pending", "rendering", "completed", "failed"]),

  /** Video width */
  width: Schema.Number,
});
export type RenderMeta = (typeof RenderMeta)["Type"];

/**
 * A render entry with its ID and metadata.
 */
export const RenderEntry = Schema.Struct({
  /** Unique identifier (datetime folder name) */
  id: Schema.String,

  /** Render metadata */
  meta: RenderMeta,
});
export type RenderEntry = (typeof RenderEntry)["Type"];

export const ThumbsData = Schema.Struct({
  /** Thumbnail sheets for dark mode */
  dark: Schema.Array(Schema.String),

  /** Thumbnail job configuration (null if no thumbs exist) */
  job: Schema.NullOr(ThumbnailsJob),

  /** Thumbnail sheets for light mode */
  light: Schema.Array(Schema.String),
});

export type ThumbsData = (typeof ThumbsData)["Type"];
