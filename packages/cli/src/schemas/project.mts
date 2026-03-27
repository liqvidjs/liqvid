import type { Duration, SerializedDuration } from "@liqvid/duration";
import { DurationOptions } from "@liqvid/duration/zod";
import { z } from "zod";

export const AspectRatio = z.object({
  height: z.number(),
  width: z.number(),
});
export type AspectRatio = z.infer<typeof AspectRatio>;

export const AspectRatioSpecifier = z.union([
  z.templateLiteral([z.number(), ":", z.number()]),
  z.tuple([z.number(), z.number()]),
  AspectRatio,
]);
export type AspectRatioSpecifier = z.infer<typeof AspectRatioSpecifier>;

/**
 * project.json files
 */
export const ProjectJson = z.object({
  aspectRatio: AspectRatioSpecifier.optional().default({
    height: 9,
    width: 16,
  }),
  name: z.string(),
});
export type ProjectJson = z.infer<typeof ProjectJson>;

/**
 * auto-generated project-meta.json files
 */
export const AutoGenProjectMeta = z.object({
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
