import { Effect, Schema } from "effect";
import { SchemaAnyFile } from "effect-paths";

/**
 * Available Whisper model names.
 *
 * These correspond to the ggml models managed by `smart-whisper`
 * (see its `MODELS` map). When a model name is used, `smart-whisper`
 * downloads it on demand into its managed model directory.
 */
export const WhisperModelName = Schema.Literals([
  "tiny",
  "tiny.en",
  "base",
  "base.en",
  "small",
  "small.en",
  "medium",
  "medium.en",
  "large-v1",
  "large-v2",
  "large-v3",
  "large-v3-turbo",
]);

export type WhisperModelName = (typeof WhisperModelName)["Type"];

/**
 * Options forwarded to `smart-whisper`'s transcription parameters.
 *
 * These map onto a subset of `TranscribeParams` from `smart-whisper`.
 */
export const WhisperOptions = Schema.Struct({
  /**
   * Spoken language code (e.g. `"en"`, `"de"`). Use `"auto"` to detect.
   * @default "auto"
   */
  language: Schema.String.pipe(
    Schema.withDecodingDefaultType(Effect.succeed("auto")),
  ),

  /**
   * Maximum segment length in characters (`0` = no limit).
   * @default 0
   */
  maxLen: Schema.Number.pipe(Schema.withDecodingDefaultType(Effect.succeed(0))),

  /**
   * Number of threads to use for inference.
   * If omitted, `smart-whisper` picks a sensible default.
   */
  nThreads: Schema.Number.pipe(Schema.optional),

  /**
   * Split segments on word rather than on token boundaries.
   * @default false
   */
  splitOnWord: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),

  /**
   * Emit per-token timestamps (required for word-level timing).
   * @default true
   */
  tokenTimestamps: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(true)),
  ),

  /** Translate from the source language to English. */
  translate: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),
});

export type WhisperOptions = (typeof WhisperOptions)["Type"];

/**
 * Configuration for Whisper transcription via `smart-whisper`.
 */
export const WhisperConfig = Schema.Struct({
  /**
   * Use the GPU for inference (Metal on macOS; BYOL elsewhere).
   * @default false
   */
  gpu: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),

  /**
   * Name of the Whisper model to use. When set (and `modelPath` is not),
   * `smart-whisper` downloads it on demand into its managed directory.
   * @default "base.en"
   */
  modelName: WhisperModelName.pipe(
    Schema.withDecodingDefaultType(Effect.succeed("base.en")),
  ),

  /**
   * Explicit path to a ggml Whisper model file. When set, this takes
   * precedence over {@link WhisperConfig.modelName} and no download occurs.
   */
  modelPath: SchemaAnyFile.pipe(Schema.optional),

  /**
   * Whether to translate to English.
   * @default false
   */
  translateToEnglish: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),

  whisperOptions: WhisperOptions.pipe(Schema.optional),
});

export type WhisperConfigIn = (typeof WhisperConfig)["Encoded"];

export type WhisperConfig = (typeof WhisperConfig)["Type"];
