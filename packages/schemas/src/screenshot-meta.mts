import * as z from "zod";

/**
 * Color scheme options for screenshots
 */
export const ColorSchemeOption = z.enum(["light", "dark", "both"]);

export type ColorSchemeOption = z.infer<typeof ColorSchemeOption>;

/**
 * Metadata for a captured screenshot
 */
export const ScreenshotMeta = z.object({
  /** Color scheme used for the screenshot */
  colorScheme: ColorSchemeOption,

  /** ISO datetime of creation */
  createdAt: z.string(),

  /** Height of screenshot */
  height: z.number(),

  /** Width of screenshot */
  width: z.number(),
});

export type ScreenshotMeta = z.infer<typeof ScreenshotMeta>;

/**
 * Screenshot entry with folder name and metadata
 */
export const ScreenshotEntry = z.object({
  /** Folder name (datetime-based) */
  id: z.string(),

  /**
   * Path to the screenshot image.
   * For "both" mode, this will be an object with light and dark paths.
   */
  imagePath: z.union([
    z.string(),
    z.object({
      dark: z.string(),
      light: z.string(),
    }),
  ]),

  /** Metadata */
  meta: ScreenshotMeta,
});

export type ScreenshotEntry = z.infer<typeof ScreenshotEntry>;
