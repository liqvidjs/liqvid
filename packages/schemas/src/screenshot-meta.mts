import { Schema } from "effect";
import { SchemaRelativeDir, SchemaRelativeFile } from "effect-paths";

/**
 * Color scheme options for screenshots
 */
export const ColorSchemeOption = Schema.Literals(["light", "dark", "both"]);

export type ColorSchemeOption = (typeof ColorSchemeOption)["Type"];

/**
 * Metadata for a captured screenshot
 */
export const ScreenshotMeta = Schema.Struct({
  /** Color scheme used for the screenshot */
  colorScheme: ColorSchemeOption,

  /** ISO datetime of creation */
  createdAt: Schema.String,

  /** Height of screenshot */
  height: Schema.Number,

  /** Width of screenshot */
  width: Schema.Number,
});

export type ScreenshotMeta = (typeof ScreenshotMeta)["Type"];

/**
 * Screenshot entry with folder name and metadata
 */
export const ScreenshotEntry = Schema.Struct({
  /** Folder name (datetime-based) */
  id: SchemaRelativeDir,

  /**
   * Path to the screenshot image.
   * For "both" mode, this will be an object with light and dark paths.
   */
  imagePath: Schema.Union([
    SchemaRelativeFile,
    Schema.Struct({
      dark: SchemaRelativeFile,
      light: SchemaRelativeFile,
    }),
  ]),

  /** Metadata */
  meta: ScreenshotMeta,
});

export type ScreenshotEntry = (typeof ScreenshotEntry)["Type"];
