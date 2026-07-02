import { z } from "zod";

export const ThumbnailsJob = z.object({
  /** Color scheme */
  colorScheme: z.enum(["light", "dark", "both"]),
  /** Number of columns per sheet */
  cols: z.number(),

  /** Seconds between screenshots */
  frequency: z.number(),

  /**
   * Height of each thumbnail
   * @default 100
   */
  height: z.number().optional().default(90),

  /** Image format: jpeg or png */
  imageFormat: z.enum(["jpeg", "png"]),

  /** Quality for JPEG images (0-100) */
  quality: z.number().optional(),

  /**
   * Number of rows per sheet
   * @default 5
   */
  rows: z.number().optional().default(5),

  /**
   * Width of each thumbnail
   * @default 160
   */
  width: z.number().optional().default(160),
});

export type ThumbnailsJob = z.infer<typeof ThumbnailsJob>;

/** Configuration for a thumbnail generation job */
export const ThumbnailOptions = z.object({
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable: z.string().optional(),

  /** Height of screenshot before resizing */
  browserHeight: z.number().optional(),

  /** Width of screenshot before resizing */
  browserWidth: z.number().optional(),

  /**
   * Color scheme
   * @default "light"
   */
  colorScheme: z.enum(["light", "dark"]).optional().default("light"),

  /**
   * Number of columns per sheet
   * @default 5
   */
  cols: z.number().optional().default(5),

  /**
   * Number of concurrent browser instances
   * @default 1
   */
  concurrency: z.number().optional().default(1),

  /**
   * Seconds between screenshots
   * @default 4
   */
  frequency: z.number().optional().default(4),

  /**
   * Height of each thumbnail
   * @default 100
   */
  height: z.number().optional().default(90),

  /**
   * Image format: jpeg or png
   * @default "png"
   */
  imageFormat: z.enum(["jpeg", "png"]).optional().default("png"),

  /** Quality for JPEG images (0-100) */
  quality: z.number().optional().default(80),

  /**
   * Number of rows per sheet
   * @default 5
   */
  rows: z.number().optional().default(5),

  /**
   * Width of each thumbnail
   * @default 160
   */
  width: z.number().optional().default(160),
});

export type ThumbnailOptionsIn = z.input<typeof ThumbnailOptions>;

export type ThumbnailOptionsOut = z.output<typeof ThumbnailOptions>;
