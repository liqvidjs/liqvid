import { z } from "zod";

/**
 * Schema for plugin recording data.
 * Data can be a Blob (for media) which requires a filename,
 * or any JSON-serializable data.
 */
export const PluginRecordingData = z.object({
  data: z.unknown(),
  /** For Blob data, the filename to save as */
  filename: z.string().optional(),
  key: z.string(),
});
export type PluginRecordingData = z.infer<typeof PluginRecordingData>;

export const saveRecordingOperation = {
  endpoint: "/recordings" as const,
  method: "POST" as const,
  search: z.object({
    url: z.string(),
  }),
};

/**
 * Serve static files from the app directory.
 * The `url` param is the path relative to the app directory.
 * Example: /api/liqvid/static/projects/my-video/.liqvid/recordings/test/@liqvid.media/audio.webm
 */
export const staticFileOperation = {
  endpoint: "/static" as const,
  search: z.object({
    url: z.string(),
  }),
};
