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
  | {
      body?: BodyModel;
      method: "DELETE";
    }
);

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

/**
 * Metadata for a render.
 */
export const RenderMeta = z.object({
  /** Color scheme used */
  colorScheme: z.enum(["light", "dark"]),

  /** Timestamp when render was created */
  createdAt: z.string(),

  /** Duration in seconds */
  duration: z.number().optional(),

  /** Frames per second */
  fps: z.number(),

  /** Video height */
  height: z.number(),

  /** Output filename */
  output: z.string(),

  /** Render status */
  status: z.enum(["pending", "rendering", "completed", "failed"]),

  /** Video width */
  width: z.number(),
});
export type RenderMeta = z.infer<typeof RenderMeta>;

/**
 * A render entry with its ID and metadata.
 */
export const RenderEntry = z.object({
  /** Unique identifier (datetime folder name) */
  id: z.string(),

  /** Render metadata */
  meta: RenderMeta,
});
export type RenderEntry = z.infer<typeof RenderEntry>;

export const startRenderOperation = {
  body: z.object({
    /** Color scheme: light or dark */
    colorScheme: z.enum(["light", "dark"]).optional(),

    /** Frames per second */
    fps: z.number().optional(),

    /** Video height */
    height: z.number().optional(),

    /** Video width */
    width: z.number().optional(),
  }),
  endpoint: "/renders/start" as const,
  method: "POST" as const,
  response: z.object({
    /** Render ID (datetime folder name) */
    id: z.string(),
  }),
  search: z.object({
    projectPath: z.string(),
  }),
};

export const listRendersOperation = {
  endpoint: "/renders" as const,
  response: z.array(RenderEntry),
  search: z.object({
    projectPath: z.string(),
  }),
};

export const renameRenderOperation = {
  body: z.object({
    /** New name for the render */
    newName: z.string(),

    /** Current render ID */
    renderId: z.string(),
  }),
  endpoint: "/renders/rename" as const,
  method: "POST" as const,
  response: z.object({
    /** New render ID (folder name) */
    newId: z.string(),
  }),
  search: z.object({
    projectPath: z.string(),
  }),
};

/**
 * Transcript entry with word and timing information.
 * Format: [word, startTimeMs, endTimeMs]
 */
export const TranscriptEntry = z.tuple([z.string(), z.number(), z.number()]);
export type TranscriptEntry = z.infer<typeof TranscriptEntry>;

/**
 * Captions metadata.
 */
export const CaptionsMeta = z.object({
  /** Path to the captions.vtt file */
  captionsPath: z.string(),

  /** Timestamp when captions were generated */
  createdAt: z.string(),

  /** Generation status */
  status: z.enum(["pending", "generating", "completed", "failed"]),

  /** Path to the transcript.json file */
  transcriptPath: z.string().optional(),
});
export type CaptionsMeta = z.infer<typeof CaptionsMeta>;

export const listCaptionsOperation = {
  endpoint: "/captions" as const,
  response: CaptionsMeta.nullable(),
  search: z.object({
    projectPath: z.string(),
  }),
};

export const generateCaptionsOperation = {
  body: z.object({
    /** Whisper model to use */
    modelName: z.string().optional(),
  }),
  endpoint: "/captions/generate" as const,
  method: "POST" as const,
  response: z.object({
    /** Status of the generation */
    status: z.enum(["started", "already_generating"]),
  }),
  search: z.object({
    projectPath: z.string(),
  }),
};
