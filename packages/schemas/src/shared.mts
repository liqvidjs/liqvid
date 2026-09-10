import { Effect, Schema } from "effect";

import { decodeEnvVar } from "./env-vars.mts";

/* ------------------------------ color scheme ------------------------------ */
export const ColorScheme = Schema.Literals(["light", "dark"]);

export const ColorSchemeSpecifier = Schema.Union([
  ColorScheme,
  Schema.Literal("system"),
]);

export const ColorSchemeOrBoth = Schema.Union([
  ColorScheme,
  Schema.Literal("both"),
]);

export type ColorSchemeOrBoth = (typeof ColorSchemeOrBoth)["Type"];

/** Reference an environment variable (exact match: `{env:VAR_NAME}`) */
export const EnvVar = Schema.TemplateLiteral([
  "{env:",
  Schema.String,
  "}",
]).pipe(decodeEnvVar);
export type EnvVar = (typeof EnvVar)["Encoded"];

/** Recognized image formats. */
export const ImageFormat = Schema.Literals(["jpeg", "png"]);

export type ImageFormat = (typeof ImageFormat)["Type"];

/** Quality parameter for JPEG images, from 1 to 100. Defaults to 80. */
export const JpegQuality = Schema.Number.pipe(
  Schema.withDecodingDefaultType(Effect.succeed(80)),
);

/**
 * A string that may contain embedded environment variable references.
 * E.g. `"https://{env:ACCOUNT_ID}.example.com"`
 *
 * At runtime, all `{env:VAR_NAME}` patterns will be replaced with the
 * corresponding environment variable values.
 */
export const StringWithEnvVars = Schema.String.pipe(
  Schema.brand("StringWithEnvVars"),
  decodeEnvVar,
);
export type StringWithEnvVars = (typeof StringWithEnvVars)["Type"];

/**
 * Transcript entry with word and timing information.
 * Format: [word, startTimeMs, endTimeMs]
 */
export const TranscriptEntry = Schema.Tuple([
  Schema.String,
  Schema.Number.pipe(
    Schema.annotate({ description: "Start time in milliseconds" }),
  ),
  Schema.Number.pipe(
    Schema.annotate({ description: "End time in milliseconds" }),
  ),
]);

export type TranscriptEntry = (typeof TranscriptEntry)["Type"];

/**
 * Rich transcript with per-word timings and caption/transcript breaks.
 */
export const RichTranscript = Schema.Struct({
  /** Array of indices indicating where caption breaks occur */
  captionBreaks: Schema.Array(Schema.Number),

  /** Array of indices indicating where paragraph breaks occur */
  paragraphBreaks: Schema.Array(Schema.Number),

  /** Array of transcript entries with word and timing information */
  words: Schema.Array(TranscriptEntry),
});

export type RichTranscript = (typeof RichTranscript)["Type"];

export const LogLevel = Schema.Literals(["debug", "info"]);

export type LogLevel = (typeof LogLevel)["Type"];

/** whether to render from development preview or production build */
export const RenderSource = Schema.Literals(["preview", "production"]);

export type RenderSource = (typeof RenderSource)["Type"];
