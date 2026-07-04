import { Effect, Schema } from "effect";

/**
 * Available Whisper model names.
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
  "large",
  "large-v3-turbo",
]);

export type WhisperModelName = (typeof WhisperModelName)["Type"];

/**
 * Configuration for Whisper transcription.
 */

export const WhisperConfig = Schema.Struct({
  /**
   * Auto-download a model if not present.
   * If set, the model will be downloaded automatically.
   */
  autoDownloadModelName: WhisperModelName.pipe(Schema.optional),

  /**
   * Name of the Whisper model to use.
   * @default "base.en"
   */
  modelName: WhisperModelName.pipe(
    Schema.withDecodingDefaultType(Effect.succeed("base.en")),
  ),

  /**
   * Directory containing the Whisper model files.
   * If not specified, uses the default nodejs-whisper location.
   */
  modelRootPath: Schema.String.pipe(Schema.optional),

  /**
   * Amount of dialogue per timestamp pair.
   * @default 20
   */
  timestampsLength: Schema.Number.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(20)),
  ),

  /**
   * Whether to translate to English.
   * @default false
   */
  translateToEnglish: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),

  /**
   * Whether to use CUDA for faster processing.
   * @default false
   */
  withCuda: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),
});

export type WhisperConfigIn = (typeof WhisperConfig)["Encoded"];

export type WhisperConfig = (typeof WhisperConfig)["Type"];
