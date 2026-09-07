import { Effect, Schema } from "effect";

import { WhisperConfig } from "./jobs/captioning.mts";
import { ThumbnailOptions } from "./jobs/thumbnails.mts";
import { ProviderConfigCopy } from "./providers/hosting/copy.mts";
import { ProviderConfigGitHubPages } from "./providers/hosting/github-pages.mts";
import { ProviderConfigLiqvidStudio } from "./providers/hosting/liqvid-studio.mts";
import { ProviderConfigS3 } from "./providers/hosting/s3.mts";
import { ProviderConfigSFTP } from "./providers/hosting/sftp.mts";
import { LogLevel, RenderSource, StringWithEnvVars } from "./shared.mts";

/** Supported locales. */
export const Locale = Schema.Literals(["en", "fr", "es", "de", "zh"] as const);
export type Locale = (typeof Locale)["Type"];

export const LiqvidConfig = Schema.Struct({
  /** JSON schema path */
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
    ]).pipe(Schema.optional),

    /**
     * Provider hosting your media files (audio, video, and thumbnails)
     */
    media: Schema.Literals(["copy", "liqvidStudio", "s3", "sftp"]).pipe(
      Schema.optional,
    ),
  }).pipe(Schema.optional),

  /**
   * Base path that content is hosted under. Should match the basePath in your framework configuration.
   */
  basePath: StringWithEnvVars.pipe(Schema.optional),

  /** Logging configuration */
  logging: Schema.Struct({
    /**
     * Logging level.
     * @default "info"
     */
    level: LogLevel.pipe(
      Schema.withDecodingDefaultType(Effect.succeed("info")),
    ),
  }).pipe(Schema.optional),

  /** Media config */
  media: Schema.Struct({
    /** Audio configuration */
    audio: Schema.Struct({
      /**
       * Whether to enable capturing multiple audio tracks.
       * If false, the audio track will be overwritten each time it is regenerated.
       * @default false
       */
      multiple: Schema.Boolean.pipe(
        Schema.withDecodingDefaultType(Effect.succeed(false)),
      ),

      /**
       * whether to render from the development preview or the production build
       * @default "preview"
       */
      source: RenderSource.pipe(
        Schema.withDecodingDefaultTypeKey(Effect.succeed("preview")),
      ),
    }).pipe(
      Schema.withDecodingDefaultType(
        Effect.succeed({ multiple: false, source: "preview" }),
      ),
    ),

    /** Captioning configuration */
    captioning: Schema.Struct({
      smartWhisperOptions: WhisperConfig.pipe(Schema.optional),
    }).pipe(Schema.optional),

    /** static rendering configuration */
    renders: Schema.Struct({
      /**
       * whether to render from the development preview or the production build
       * @default "preview"
       */
      source: RenderSource.pipe(
        Schema.withDecodingDefaultTypeKey(Effect.succeed("preview")),
      ),
    }).pipe(
      Schema.withDecodingDefaultType(Effect.succeed({ source: "preview" })),
    ),

    /** screenshots configuration */
    screenshots: Schema.Struct({
      /**
       * whether to render from the development preview or the production build
       * @default "preview"
       */
      source: RenderSource.pipe(
        Schema.withDecodingDefaultTypeKey(Effect.succeed("preview")),
      ),
    }).pipe(
      Schema.withDecodingDefaultType(Effect.succeed({ source: "preview" })),
    ),

    /** Thumbnail generation configuration */
    thumbnails: Schema.Struct({
      defaults: ThumbnailOptions,

      /**
       * whether to render from the development preview or the production build
       * @default "preview"
       */
      source: RenderSource.pipe(
        Schema.withDecodingDefaultTypeKey(Effect.succeed("preview")),
      ),
    }).pipe(Schema.optional),
  }).pipe(Schema.optional),

  providers: Schema.Struct({
    // hosting
    copy: ProviderConfigCopy.pipe(Schema.optional),
    githubPages: ProviderConfigGitHubPages.pipe(Schema.optional),
    liqvidStudio: ProviderConfigLiqvidStudio.pipe(Schema.optional),
    s3: ProviderConfigS3.pipe(Schema.optional),
    sftp: ProviderConfigSFTP.pipe(Schema.optional),
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
            // standard media files
            "**/*.gif",
            "**/*.jpeg",
            "**/*.jpg",
            "**/*.m3u8",
            "**/*.mov",
            "**/*.mp4",
            "**/*.png",
            "**/*.webm",
            "**/*.vtt",

            // omit params file
            "!**/.params=*",

            // omit social share images handled by Next
            "!**/opengraph-image.*",
            "!**/twitter-image.*",

            // OS X
            "!**/.DS_Store",

            // exclude preview dir
            "!**/.liqvid/preview",

            // assets dir
            "**/.liqvid/**/*",

            // distinguish Transport Stream files from TypeScript files
            "**/.liqvid/**/*.ts",
            "!**/.liqvid/types.ts",
            "!**/*.d.ts",
            "!**/*.d.json.ts",

            // audio
            "!**/.liqvid/**/audio/audio.wav",
            "!**/.liqvid/**/audio/audio-meta.json",
            "!**/.liqvid/**/audio/captions-meta.json",
            "!**/.liqvid/**/audio/transcript-raw.json",

            // codemirror
            "!**/.liqvid/**/@lqv+codemirror/raw.json",

            // media recording
            "!**/.liqvid/**/@liqvid+media/video.webm",

            // renders
            "!**/.liqvid/**/renders",
            "!**/.liqvid/**/screenshots",
            "!**/.liqvid/**/thumbs/thumbnails-job.json",
          ]),
        ),
      ),
    }).pipe(Schema.optional),
  }).pipe(Schema.optional),

  /**
   * Root-level static parameters that apply to all projects.
   * These are used as fallbacks when a project does not define its own parameters.
   * Format: `{ parameterName: [value1, value2, ...] }`
   *
   * **Note:** `"value"` is not permitted as a parameter name, since it is
   * reserved for use in parametrized string entries (e.g. parametrized `title`
   * and `description`).
   */
  rootParameters: Schema.Record(
    Schema.String,
    Schema.Array(Schema.String),
  ).pipe(Schema.optional),

  ui: Schema.Struct({
    /** Locale for Liqvid Studio user interface. */
    locale: Locale.pipe(Schema.withDecodingDefaultType(Effect.succeed("en"))),
  }).pipe(Schema.optional),
});

export type LiqvidConfigIn = (typeof LiqvidConfig)["Encoded"];

export type LiqvidConfig = (typeof LiqvidConfig)["Type"];

/** @deprecated Use {@link LiqvidConfig} (the decoded type) instead. */
export type LiqvidConfigOut = (typeof LiqvidConfig)["Type"];
