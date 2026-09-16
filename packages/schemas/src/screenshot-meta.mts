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
  colorScheme: ColorSchemeOption.pipe(
    Schema.annotate({ description: "Color scheme used for the screenshot" }),
  ),

  /** ISO datetime of creation */
  createdAt: Schema.String.pipe(
    Schema.annotate({ description: "ISO datetime of creation" }),
  ),

  /** Height of screenshot */
  height: Schema.Number.pipe(
    Schema.annotate({ description: "Height of screenshot" }),
  ),

  /** Width of screenshot */
  width: Schema.Number.pipe(
    Schema.annotate({ description: "Width of screenshot" }),
  ),
});

export type ScreenshotMeta = (typeof ScreenshotMeta)["Type"];

/**
 * Screenshot entry with folder name and metadata
 */
export const ScreenshotEntry = Schema.Struct({
  /** Folder name (datetime-based) */
  id: SchemaRelativeDir.pipe(
    Schema.annotate({ description: "Folder name (datetime-based)" }),
  ),

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
  ]).pipe(
    Schema.annotate({
      description:
        'Path to the screenshot image. For "both" mode, this will be an object with light and dark paths.',
    }),
  ),

  /** Metadata */
  meta: ScreenshotMeta.pipe(Schema.annotate({ description: "Metadata" })),
});

export type ScreenshotEntry = (typeof ScreenshotEntry)["Type"];
