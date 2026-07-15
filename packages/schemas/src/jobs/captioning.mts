import z from "zod";

/**
 * Available Whisper model names.
 *
 * These correspond to the ggml models managed by `smart-whisper`
 * (see its `MODELS` map). When a model name is used, `smart-whisper`
 * downloads it on demand into its managed model directory.
 */
export const WhisperModelName = z.enum([
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
export type WhisperModelName = z.infer<typeof WhisperModelName>;

/**
 * Options forwarded to `smart-whisper`'s transcription parameters.
 */
export const WhisperOptions = z.object({
  /**
   * Spoken language code (e.g. `"en"`, `"de"`). Use `"auto"` to detect.
   * @default "auto"
   */
  language: z.string().default("auto"),

  /**
   * Maximum segment length in characters (`0` = no limit).
   * @default 0
   */
  maxLen: z.number().default(0),

  /**
   * Number of threads to use for inference.
   */
  nThreads: z.number().optional(),

  /**
   * Split segments on word rather than on token boundaries.
   * @default false
   */
  splitOnWord: z.boolean().default(false),

  /**
   * Emit per-token timestamps (required for word-level timing).
   * @default true
   */
  tokenTimestamps: z.boolean().default(true),

  /** Translate from the source language to English. */
  translate: z.boolean().default(false),
});
export type WhisperOptions = z.infer<typeof WhisperOptions>;

/**
 * Configuration for Whisper transcription via `smart-whisper`.
 */
export const WhisperConfig = z.object({
  /**
   * Use the GPU for inference (Metal on macOS; BYOL elsewhere).
   * @default false
   */
  gpu: z.boolean().default(false).optional(),

  /**
   * Name of the Whisper model to use. When set (and `modelPath` is not),
   * `smart-whisper` downloads it on demand into its managed directory.
   * @default "base.en"
   */
  modelName: WhisperModelName.default("base.en"),

  /**
   * Explicit path to a ggml Whisper model file. When set, this takes
   * precedence over `modelName` and no download occurs.
   */
  modelPath: z.string().optional(),

  /**
   * Whether to translate to English.
   * @default false
   */
  translateToEnglish: z.boolean().default(false).optional(),

  whisperOptions: WhisperOptions.optional(),
});
export type WhisperConfig = z.infer<typeof WhisperConfig>;
