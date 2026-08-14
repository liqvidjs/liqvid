import type { SerializedDuration } from "@liqvid/duration";
import { Duration } from "@liqvid/duration";
import { DurationOptions } from "@liqvid/duration/effect";
import { Effect, Schema } from "effect";
import { RelativeDir } from "effect-paths";

export const AspectRatio = Schema.Struct({
  height: Schema.Number,
  width: Schema.Number,
});
export type AspectRatio = (typeof AspectRatio)["Type"];

export const AspectRatioSpecifier = Schema.Union([
  Schema.TemplateLiteral([Schema.Number, ":", Schema.Number]),
  Schema.Tuple([Schema.Number, Schema.Number]),
  AspectRatio,
]);
export type AspectRatioSpecifier = (typeof AspectRatioSpecifier)["Type"];

/**
 * project.json files
 */
export const ProjectJson = Schema.Struct({
  $schema: Schema.String.pipe(Schema.optional),

  /** aspect ratio of project */
  aspectRatio: AspectRatioSpecifier.pipe(
    Schema.withDecodingDefaultType(
      Effect.succeed({
        height: 9,
        width: 16,
      }),
    ),
  ),

  description: Schema.String.pipe(Schema.optional),

  /** Set this to true to omit the project from the production build. */
  draft: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),

    Schema.annotateEncoded({
      description:
        "Set this to true to omit the project from the production build.",
    }),
  ),

  /** name of the project */
  name: Schema.String,

  /** static parameters */
  parameters: Schema.Record(Schema.String, Schema.Array(Schema.String)).pipe(
    Schema.optional,
  ),
});

export type ProjectJson = (typeof ProjectJson)["Type"];

/**
 * auto-generated project-meta.json files
 */
export const AutoGenProjectMeta = Schema.Struct({
  /** duration of project */
  duration: DurationOptions,
});
export type AutoGenProjectMeta = (typeof AutoGenProjectMeta)["Type"];

export const ProjectMeta = Schema.Struct({
  aspectRatio: AspectRatio,

  duration: DurationOptions.pipe(Schema.decodeTo(Schema.instanceOf(Duration))),

  name: Schema.String,
  openGraph: Schema.Boolean,

  /**
   * Static parameters for this project. Used to interpolate path parameters
   * when linking to projects. Format: `{ parameterName: [value1, value2, ...] }`
   */
  parameters: Schema.Record(Schema.String, Schema.Array(Schema.String)).pipe(
    Schema.optional,
  ),

  path: Schema.String.pipe(Schema.fromBrand("RelativeDir", RelativeDir)),

  twitter: Schema.Boolean,
});

export type ProjectMeta = (typeof ProjectMeta)["Type"];

/**
 * Wire representation of {@link ProjectMeta}. The `duration` field carries the
 * `@liqvid/duration` serialization marker so it can be revived with
 * `deserialize` on the client.
 */
export type SerializedProjectMeta = Omit<ProjectMeta, "duration"> & {
  duration: SerializedDuration;
};

/**
 * Root parameters type for the liqvid.json configuration.
 * Format: `{ parameterName: [value1, value2, ...] }`
 */
export type RootParameters = Record<string, string[]>;
