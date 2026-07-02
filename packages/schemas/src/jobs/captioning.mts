import z from "zod";

/**
 * Available Whisper model names.
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
  "large",
  "large-v3-turbo",
]);
export type WhisperModelName = z.infer<typeof WhisperModelName>;
/**
 * Configuration for Whisper transcription.
 */

export const WhisperConfig = z.object({
  /**
   * Auto-download a model if not present.
   * If set, the model will be downloaded automatically.
   */
  autoDownloadModelName: WhisperModelName.optional(),

  /**
   * Name of the Whisper model to use.
   * @default "base.en"
   */
  modelName: WhisperModelName.default("base.en"),

  /**
   * Directory containing the Whisper model files.
   * If not specified, uses the default nodejs-whisper location.
   */
  modelRootPath: z.string().optional(),

  /**
   * Amount of dialogue per timestamp pair.
   * @default 20
   */
  timestampsLength: z.number().default(20).optional(),

  /**
   * Whether to translate to English.
   * @default false
   */
  translateToEnglish: z.boolean().default(false).optional(),

  /**
   * Whether to use CUDA for faster processing.
   * @default false
   */
  withCuda: z.boolean().default(false).optional(),
});
export type WhisperConfig = z.infer<typeof WhisperConfig>;
