import type { Duration, SerializedDuration } from "@liqvid/duration";
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

export type ProjectMeta = {
  aspectRatio: AspectRatio;
  duration: Duration;
  name: string;
  openGraph: boolean;
  path: string;
  twitter: boolean;
};

export type SerializedProjectMeta = {
  aspectRatio: AspectRatio;
  duration: SerializedDuration;
  name: string;
  openGraph: boolean;
  path: string;
  twitter: boolean;
};
