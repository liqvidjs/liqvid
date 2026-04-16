import { z } from "zod";

import {
  ProviderConfigCopy,
  ProviderConfigGitHubPages,
  ProviderConfigLiqvidStudio,
  ProviderConfigS3,
  ProviderConfigSFTP,
} from "./providers/hosting/index.mts";
import {
  ProviderConfigBlueSky,
  ProviderConfigFacebook,
  ProviderConfigInstagram,
  ProviderConfigTwitter,
  ProviderConfigYouTube,
} from "./providers/social/index.mts";

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

export const LiqvidConfig = z.object({
  $schema: z.string().optional(),

  /** Configure your hosting backends */
  backend: z.object({
    /**
     * Provider hosting your content files (html/css/js)
     */
    content: z.enum(["copy", "githubPages", "liqvidStudio", "s3", "sftp"]),

    /**
     * Provider hosting your media files (audio, video, and thumbnails)
     */
    media: z.enum(["copy", "liqvidStudio", "s3", "sftp"]),
  }),

  captioning: z
    .object({
      nodeWhisperOptions: WhisperConfig.optional(),
    })
    .optional(),

  providers: z.object({
    // social
    bluesky: ProviderConfigBlueSky.optional(),

    // hosting
    copy: ProviderConfigCopy.optional(),
    facebook: ProviderConfigFacebook.optional(),
    githubPages: ProviderConfigGitHubPages.optional(),
    instagram: ProviderConfigInstagram.optional(),
    liqvidStudio: ProviderConfigLiqvidStudio.optional(),
    s3: ProviderConfigS3.optional(),
    sftp: ProviderConfigSFTP.optional(),
    twitter: ProviderConfigTwitter.optional(),
    youtube: ProviderConfigYouTube.optional(),
  }),

  /** Publishing configuration */
  publishing: z
    .object({
      /**
       * If true, delete remote files that are not in the local publish set.
       * Similar to rsync's --delete flag. Only applies to content under the
       * configured bucket prefix.
       *
       * @default false
       */
      delete: z.boolean().optional().default(false),

      /** Glob patterns of files to include when publishing */
      include: z
        .object({
          /** Glob patterns of media files to include when publishing media */
          media: z.array(z.string()).optional().default([
            "**/*.gif",
            "**/*.jpeg",
            "**/*.jpg",
            "**/*.m3u8",
            "**/*.mov",
            "**/*.mp4",
            "**/*.png",
            "**/*.webm",

            // omit social share images handled by Next
            "!**/opengraph-image.*",
            "!**/twitter-image.*",

            // distinguish Transport Stream files from TypeScript files
            "**/.liqvid/**/*.ts",
            "!**/.liqvid/types.ts",
            "!**/*.d.ts",
            "!**/*.d.json.ts",
          ]),
        })
        .optional(),
    })
    .optional(),

  /** Whisper transcription configuration */
  whisper: WhisperConfig.optional(),
});
export type LiqvidConfig = z.infer<typeof LiqvidConfig>;
