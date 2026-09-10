import { Effect, Schema } from "effect";
import { SchemaAbsoluteFile } from "effect-paths";

import { ColorSchemeOrBoth, ImageFormat, JpegQuality } from "../shared.mts";

export const ThumbnailsJob = Schema.Struct({
  /** Color scheme */
  colorScheme: ColorSchemeOrBoth,

  /**
   * Number of columns per sheet
   * @default 5
   */
  cols: Schema.Number.pipe(Schema.withDecodingDefaultType(Effect.succeed(5))),

  /**
   * Seconds between screenshots
   * @default 1
   */
  frequency: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(1)),
  ),

  /**
   * Height of each thumbnail
   * @default 90
   */
  height: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(90)),
  ),

  /** Image format: jpeg or png */
  imageFormat: ImageFormat.pipe(
    Schema.withDecodingDefaultType(Effect.succeed("jpeg")),
  ),

  /**
   * Quality for JPEG images (0-100)
   * @default 80
   */
  quality: JpegQuality.pipe(Schema.withDecodingDefaultType(Effect.succeed(80))),

  /**
   * Number of rows per sheet
   * @default 5
   */
  rows: Schema.Number.pipe(Schema.withDecodingDefaultType(Effect.succeed(5))),

  /**
   * Width of each thumbnail
   * @default 160
   */
  width: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(160)),
  ),
});

export type ThumbnailsJobIn = (typeof ThumbnailsJob)["Encoded"];
export type ThumbnailsJob = (typeof ThumbnailsJob)["Type"];

/** Configuration for a thumbnail generation job */
export const ThumbnailOptions = Schema.Struct({
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable: SchemaAbsoluteFile.pipe(Schema.optional),

  /**
   * Height of screenshot before resizing
   * @default 450
   */
  browserHeight: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(450)),
  ),

  /**
   * Width of screenshot before resizing
   * @default 800
   */
  browserWidth: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(800)),
  ),

  /**
   * Color scheme
   * @default "light"
   */
  colorScheme: Schema.Literals(["light", "dark"]).pipe(
    Schema.withDecodingDefaultType(Effect.succeed("light")),
  ),

  /**
   * Number of columns per sheet
   * @default 5
   */
  cols: Schema.Number.pipe(Schema.withDecodingDefaultType(Effect.succeed(5))),

  /**
   * Number of concurrent browser instances
   * @default 1
   */
  concurrency: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(1)),
  ),

  /**
   * Seconds between screenshots
   * @default 4
   */
  frequency: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(4)),
  ),

  /**
   * Height of each thumbnail
   * @default 90
   */
  height: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(90)),
  ),

  /**
   * Image format: jpeg or png
   * @default "png"
   */
  imageFormat: ImageFormat.pipe(
    Schema.withDecodingDefaultType(Effect.succeed("png")),
  ),

  /** Quality for JPEG images (0-100) */
  quality: JpegQuality,

  /**
   * Number of rows per sheet
   * @default 5
   */
  rows: Schema.Number.pipe(Schema.withDecodingDefaultType(Effect.succeed(5))),

  /**
   * Width of each thumbnail
   * @default 160
   */
  width: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(160)),
  ),
});

export type ThumbnailOptionsIn = (typeof ThumbnailOptions)["Encoded"];

export type ThumbnailOptions = (typeof ThumbnailOptions)["Type"];
