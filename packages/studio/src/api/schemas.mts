import { ThumbnailsJob } from "@liqvid/schemas";
import type { JSONValue } from "@liqvid/ssr";
import { type Fiber, Schema, SchemaTransformation } from "effect";

import { CaptionsMeta } from "../types/schemas.mts";

export const SerializedDate = Schema.Struct({
  __deser: Schema.Literal("Date"),
  iso: Schema.String,
}).pipe(
  Schema.decodeTo(
    Schema.Date,
    SchemaTransformation.transform({
      decode: (from) => new Date(from.iso),
      encode: (to) => ({
        __deser: "Date" as const,
        iso: to.toISOString(),
      }),
    }),
  ),
);

export type SerializedDate = (typeof SerializedDate)["Encoded"];

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

export const StructuredLogType = Schema.Literals([
  "debug",
  "error",
  "info",
  "log",
  "warn",
]);

export type StructuredLogType = (typeof StructuredLogType)["Type"];

export const StructuredLog = Schema.Struct({
  /** Annotations for the log message */
  annotations: Schema.Record(Schema.String, Schema.Json),

  /** Log message */
  message: Schema.Array(Schema.Json),

  /** Span timings */
  spans: Schema.Array(Schema.Tuple([Schema.String, Schema.Number])),

  /** Timestamp of the log message */
  timestamp: SerializedDate,

  /** Log level */
  type: StructuredLogType,
});

export type StructuredLogEncoded = (typeof StructuredLog)["Encoded"] & {
  readonly annotations: { readonly [key: string]: JSONValue };
  readonly message: readonly JSONValue[];
  readonly timestamp: SerializedDate;
};
export type StructuredLog = (typeof StructuredLog)["Type"];

export const LoggableJobState = Schema.Literals([
  "running",
  "completed",
  "cancelled",
  "failed",
]);

export type LoggableJobState = (typeof LoggableJobState)["Type"];

export const LoggableJobClient = Schema.Struct({
  id: Schema.String,

  logs: Schema.Array(StructuredLog).pipe(Schema.mutable),

  name: Schema.String,

  path: Schema.optional(Schema.String),

  startTime: SerializedDate,

  state: LoggableJobState,
});

// TODO: awkward
export type LoggableJobClientEncoded = Omit<
  (typeof LoggableJobClient)["Encoded"],
  "logs"
> & {
  readonly logs: StructuredLogEncoded[];
  readonly startTime: SerializedDate;
};
export type LoggableJobClient = (typeof LoggableJobClient)["Type"];

export const LoggableJob = LoggableJobClient.pipe(
  Schema.fieldsAssign({
    fiber: Schema.Unknown as Schema.Schema<Fiber.Fiber<unknown, unknown>>,
  }),
);

export type LoggableJob = (typeof LoggableJob)["Type"];

/**
 * The lifecycle state of a long-running service. Unlike jobs, services are not
 * expected to complete: they run for the lifetime of the process, unless they
 * fail or are stopped.
 */
export const ServiceState = Schema.Literals(["running", "stopped", "failed"]);

export type ServiceState = (typeof ServiceState)["Type"];

/**
 * The client-facing snapshot of a long-running service, broadcast over
 * WebSockets. Like {@link LoggableJobClient}, but without a fiber and with a
 * service-specific lifecycle {@link ServiceState}.
 */
export const ServiceClient = Schema.Struct({
  id: Schema.String,

  logs: Schema.Array(StructuredLog).pipe(Schema.mutable),

  name: Schema.String,

  startTime: SerializedDate,

  state: ServiceState,
});

export type ServiceClientEncoded = (typeof ServiceClient)["Encoded"] & {
  logs: StructuredLogEncoded[];
  readonly startTime: SerializedDate;
};
export type ServiceClient = (typeof ServiceClient)["Type"];

/**
 * A long-running service as tracked on the server: the client snapshot plus the
 * (non-serializable) fiber running it.
 */
export const Service = ServiceClient.pipe(
  Schema.fieldsAssign({
    fiber: Schema.Unknown as Schema.Schema<Fiber.Fiber<unknown, unknown>>,
  }),
);

export type Service = (typeof Service)["Type"];
