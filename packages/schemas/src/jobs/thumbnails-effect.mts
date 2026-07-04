import { Effect, Schema } from "effect";

import {
  ColorSchemeInputSpecifier,
  ImageFormat,
  JpegQuality,
} from "../shared-effect.mts";

export const ThumbnailsJob = Schema.Struct({
  /** Color scheme */
  colorScheme: ColorSchemeInputSpecifier,

  /** Number of columns per sheet */
  cols: Schema.Number,

  /** Seconds between screenshots */
  frequency: Schema.Number,

  /**
   * Height of each thumbnail
   * @default 90
   */
  height: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(90)),
  ),

  /** Image format: jpeg or png */
  imageFormat: ImageFormat,

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

export type ThumbnailsJob = (typeof ThumbnailsJob)["Type"];

/** Configuration for a thumbnail generation job */
export const ThumbnailOptions = Schema.Struct({
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable: Schema.String.pipe(Schema.optional),

  /** Height of screenshot before resizing */
  browserHeight: Schema.Number.pipe(Schema.optional),

  /** Width of screenshot before resizing */
  browserWidth: Schema.Number.pipe(Schema.optional),

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

export type ThumbnailOptionsOut = (typeof ThumbnailOptions)["Type"];
