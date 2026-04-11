import { RecordingMeta } from "@liqvid/schemas";
import { ScreenshotEntry } from "@liqvid/schemas/screenshot-meta";
import { z } from "zod";

export type Operation<
  BodyModel extends z.ZodType,
  ErrorModel extends z.ZodType,
  ResponseModel extends z.ZodType,
  SearchModel extends z.ZodType,
> = {
  endpoint: string;
  error?: ErrorModel;
  response?: ResponseModel;
  search?: SearchModel;
} & (
  | { body?: undefined; method?: "GET" }
  | {
      body?: BodyModel;
      method: "POST";
    }
);

export const listRecordingsOperation = {
  endpoint: "/recordings" as const,
  response: z.array(RecordingMeta),
  search: z.object({
    url: z.string(),
  }),
};

export const setProjectMetaOperation = {
  body: z.object({
    durationMs: z.number(),
  }),
  endpoint: "/project-meta" as const,
  method: "POST" as const,
  search: z.object({
    url: z.string(),
  }),
};

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
 * Example: /api/liqvid/static?url=/projects/my-video/.liqvid/recordings/test/@liqvid.media/audio.webm
 */
export const staticFileOperation = {
  endpoint: "/static" as const,
  search: z.object({
    url: z.string(),
  }),
};

export const listScreenshotsOperation = {
  endpoint: "/screenshots" as const,
  response: z.array(ScreenshotEntry),
  search: z.object({
    projectPath: z.string(),
  }),
};

export const captureScreenshotOperation = {
  body: z.object({
    /** Color scheme: light, dark, or both */
    colorScheme: z.enum(["light", "dark", "both"]).optional(),
    /** Height of screenshot */
    height: z.number(),
    /** Time in seconds to capture */
    time: z.number(),
    /** Width of screenshot */
    width: z.number(),
  }),
  endpoint: "/screenshots/capture" as const,
  method: "POST" as const,
  response: ScreenshotEntry,
  search: z.object({
    projectPath: z.string(),
  }),
};

export const copyScreenshotOperation = {
  body: z.object({
    /** Screenshot folder id */
    screenshotId: z.string(),
    /** Source filename for "both" mode (light.png or dark.png) */
    sourceFilename: z.enum(["light.png", "dark.png"]).optional(),
    /** Target filename (opengraph-image.png or twitter-image.png) */
    targetFilename: z.enum(["opengraph-image.png", "twitter-image.png"]),
  }),
  endpoint: "/screenshots/copy" as const,
  method: "POST" as const,
  search: z.object({
    projectPath: z.string(),
  }),
};

export const checkImageExistsOperation = {
  endpoint: "/screenshots/check-exists" as const,
  response: z.object({
    exists: z.boolean(),
  }),
  search: z.object({
    filename: z.enum(["opengraph-image.png", "twitter-image.png"]),
    projectPath: z.string(),
  }),
};

export const generateThumbsOperation = {
  body: z.object({
    /** Color scheme: light, dark, or both */
    colorScheme: z.enum(["light", "dark", "both"]).optional(),

    /** Number of columns per sheet */
    cols: z.number().optional(),

    /** Seconds between screenshots */
    frequency: z.number().optional(),

    /** Height of each thumbnail */
    height: z.number().optional(),

    /** Image format: jpeg or png */
    imageFormat: z.enum(["jpeg", "png"]).optional(),

    /** Quality for JPEG images (0-100) */
    quality: z.number().optional(),

    /** Number of rows per sheet */
    rows: z.number().optional(),

    /** Width of each thumbnail */
    width: z.number().optional(),
  }),
  endpoint: "/thumbs/generate" as const,
  method: "POST" as const,
  response: z.object({
    /** Thumbnail sheets for dark mode (if colorScheme is "dark" or "both") */
    dark: z.array(z.string()).optional(),
    /** Thumbnail sheets for light mode (if colorScheme is "light" or "both") */
    light: z.array(z.string()).optional(),
    /** Number of thumbnail sheets generated per color scheme */
    numSheets: z.number(),
  }),
  search: z.object({
    projectPath: z.string(),
  }),
};

export const listThumbsOperation = {
  endpoint: "/thumbs" as const,
  response: z.object({
    /** Thumbnail sheets for dark mode */
    dark: z.array(z.string()),
    /** Thumbnail sheets for light mode */
    light: z.array(z.string()),
  }),
  search: z.object({
    projectPath: z.string(),
  }),
};
