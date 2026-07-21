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
  aspectRatio: AspectRatioSpecifier.pipe(
    Schema.withDecodingDefaultType(
      Effect.succeed({
        height: 9,
        width: 16,
      }),
    ),
  ),
  name: Schema.String,
});
export type ProjectJson = (typeof ProjectJson)["Type"];

/**
 * auto-generated project-meta.json files
 */
export const AutoGenProjectMeta = Schema.Struct({
  duration: DurationOptions,
});
export type AutoGenProjectMeta = (typeof AutoGenProjectMeta)["Type"];

export const ProjectMeta = Schema.Struct({
  aspectRatio: AspectRatio,
  duration: DurationOptions.pipe(Schema.decodeTo(Schema.instanceOf(Duration))),
  name: Schema.String,
  openGraph: Schema.Boolean,

  path: Schema.String.pipe(Schema.fromBrand("RelativeDir", RelativeDir)),

  twitter: Schema.Boolean,
});

export type ProjectMeta = (typeof ProjectMeta)["Type"];

/**
 * Wire representation of {@link ProjectMeta}. The `duration` field carries the
 * `@liqvid/duration` serialization marker so it can be revived with
 * `deserialize` on the client.
 */
export type SerializedProjectMeta = Omit<
  (typeof ProjectMeta)["Encoded"],
  "duration"
> & {
  duration: SerializedDuration;
};
