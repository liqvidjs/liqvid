import { Effect, Schema } from "effect";

import { WhisperConfig } from "./jobs/captioning-effect.mts";
import { ThumbnailOptions } from "./jobs/thumbnails-effect.mts";
import { ProviderConfigS3 } from "./providers/hosting/s3-effect.mts";
import { StringWithEnvVars } from "./shared-effect.mts";

export const LiqvidConfig = Schema.Struct({
  $schema: Schema.optional(Schema.String),

  /** Configure your hosting backends */
  backend: Schema.Struct({
    /**
     * Provider hosting your content files (html/css/js)
     */
    content: Schema.Literals([
      "copy",
      "githubPages",
      "liqvidStudio",
      "s3",
      "sftp",
    ]),

    /**
     * Provider hosting your media files (audio, video, and thumbnails)
     */
    media: Schema.Literals(["copy", "liqvidStudio", "s3", "sftp"]),
  }),

  /**
   * Base path that content is hosted under. Should match the basePath in your framework configuration.
   */
  basePath: StringWithEnvVars.pipe(Schema.optional),

  /** Media config */
  media: Schema.Struct({
    /** Captioning configuration */
    captioning: Schema.Struct({
      nodeWhisperOptions: WhisperConfig.pipe(Schema.optional),
    }).pipe(Schema.optional),

    /** Thumbnail generation configuration */
    thumbnails: Schema.Struct({
      defaults: ThumbnailOptions,
    }),
  }).pipe(Schema.optional),

  providers: Schema.Struct({
    // social
    // bluesky: ProviderConfigBlueSky.optional(),
    // hosting
    // copy: ProviderConfigCopy.optional(),
    // facebook: ProviderConfigFacebook.optional(),
    // githubPages: ProviderConfigGitHubPages.optional(),
    // instagram: ProviderConfigInstagram.optional(),
    // liqvidStudio: ProviderConfigLiqvidStudio.optional(),
    s3: ProviderConfigS3.pipe(Schema.optional),
    // sftp: ProviderConfigSFTP.optional(),
    // twitter: ProviderConfigTwitter.optional(),
    // youtube: ProviderConfigYouTube.optional(),
  }),

  /** Publishing configuration */
  publishing: Schema.Struct({
    /**
     * If true, delete remote files that are not in the local publish set.
     * Similar to rsync's --delete flag. Only applies to content under the
     * configured bucket prefix.
     *
     * @default false
     */
    delete: Schema.Boolean.pipe(
      Schema.withDecodingDefaultType(Effect.succeed(false)),
    ),

    /** Glob patterns of files to include when publishing */
    include: Schema.Struct({
      /** Glob patterns of media files to include when publishing media */
      media: Schema.Array(Schema.String).pipe(
        Schema.optional,
        Schema.withDecodingDefaultType(
          Effect.succeed([
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
        ),
      ),
    }).pipe(Schema.optional),
  }).pipe(Schema.optional),
});

export type LiqvidConfigIn = (typeof LiqvidConfig)["Encoded"];

export type LiqvidConfig = (typeof LiqvidConfig)["Type"];

export const LiqvidConfigFromJson = Schema.fromJsonString(LiqvidConfig);
