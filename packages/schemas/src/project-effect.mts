import { Duration } from "@liqvid/duration";
import { DurationOptions } from "@liqvid/duration/effect";
import { Effect, Schema } from "effect";
import type { z } from "zod";

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
export type AspectRatioSpecifier = z.infer<typeof AspectRatioSpecifier>;

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
export type ProjectJson = z.infer<typeof ProjectJson>;

/**
 * auto-generated project-meta.json files
 */
export const AutoGenProjectMeta = Schema.Struct({
  duration: DurationOptions,
});
export type AutoGenProjectMeta = z.infer<typeof AutoGenProjectMeta>;

export const ProjectMeta = Schema.Struct({
  aspectRatio: AspectRatio,
  duration: DurationOptions.pipe(Schema.decodeTo(Schema.instanceOf(Duration))),
  name: Schema.String,
  openGraph: Schema.Boolean,

  path: Schema.String,

  twitter: Schema.Boolean,
});

export type ProjectMeta = (typeof ProjectMeta)["Type"];
export type SerializedProjectMeta = (typeof ProjectMeta)["Encoded"];
