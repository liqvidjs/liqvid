import z from "zod";

/**
 * - `screenshot`: rendering to take a screenshot of one frame
 * - `thumbs`: rendering to generate thumbnails
 * - `video`: static video export
 * - `web`: the default experience
 * */
export const RenderMode = z.enum(["screenshot", "thumbs", "video", "web"]);

export type RenderMode = z.infer<typeof RenderMode>;
