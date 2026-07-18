import { Effect, Schema } from "effect";

import { WhisperConfig } from "./jobs/captioning-effect.mts";
import { ThumbnailOptions } from "./jobs/thumbnails-effect.mts";
import { ProviderConfigCopy } from "./providers/hosting/copy-effect.mts";
import { ProviderConfigS3 } from "./providers/hosting/s3-effect.mts";
import { LogLevel, StringWithEnvVars } from "./shared-effect.mts";

/** Supported locales. */
export const Locale = Schema.Literals(["en", "fr", "es", "de", "zh"] as const);
export type Locale = (typeof Locale)["Type"];

// TODO: implement this
// 1. Define a helper function to extract member defaults from a Struct's AST
// export const getStructDefaults = <Fields extends Schema.Struct.Fields>(
//   schema: Schema.Struct<Fields>
// ): Schema.Schema.Type<Schema.Struct<Fields>> => {
//   const defaults: Record<string, any> = {}
//
//   // Navigate the AST to pull the default values defined on individual property signatures
//   if (AST.isTypeLiteral(schema.ast)) {
//     for (const property of schema.ast.propertySignatures) {
//       const defaultValueAnnotation = property.annotations[AST.ConstructorDefaultId]
//
//       if (defaultValueAnnotation !== undefined) {
//         // execute or unpack the constructor default (which can be a thunk or an Effect)
//         const defaultThunk = defaultValueAnnotation as () => unknown
//         defaults[property.name as string] = defaultThunk()
//       }
//     }
//   }
//
//   return defaults as any
// }
//
// // 2. Define your Struct and assign default values to members using pipe()
// const MyStruct = Schema.Struct({
//   name: Schema.String.pipe(Schema.withConstructorDefault(() => "Anonymous")),
//   age: Schema.Number.pipe(Schema.withConstructorDefault(() => 18)),
//   isAdmin: Schema.Boolean.pipe(Schema.withConstructorDefault(() => false)),
// })
//
// // 3. Infer the parent Struct's default value automatically from its members
// const myStructDefaultValue = getStructDefaults(MyStruct)
//
// // 4. Attach the inferred default value to the parent Struct itself
// const MyStructWithFallback = MyStruct.pipe(
//   Schema.withConstructorDefault(() => myStructDefaultValue)
// )

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
    }).pipe(
      Schema.withDecodingDefaultType(Effect.succeed({ multiple: false })),
    ),

    /** Captioning configuration */
    captioning: Schema.Struct({
      smartWhisperOptions: WhisperConfig.pipe(Schema.optional),
    }).pipe(Schema.optional),

    /** Thumbnail generation configuration */
    thumbnails: Schema.Struct({
      defaults: ThumbnailOptions,
    }).pipe(Schema.optional),
  }).pipe(Schema.optional),

  providers: Schema.Struct({
    // social
    // bluesky: ProviderConfigBlueSky.optional(),
    // hosting
    copy: ProviderConfigCopy.pipe(Schema.optional),
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
            "!**/.liqvid/audio/audio-meta.json",
            "!**/.liqvid/audio/captions-meta.json",
            "!**/.liqvid/audio/transcript-raw.json",

            // codemirror
            "!**/.liqvid/**/@lqv@codemirror/raw.json",

            // media recording
            "!**/.liqvid/**/@liqvid@media/video.webm",

            // renders
            "!**/.liqvid/renders",
            "!**/.liqvid/screenshots",
            "!**/.liqvid/thumbs/thumbnails-job.json",
          ]),
        ),
      ),
    }).pipe(Schema.optional),
  }).pipe(Schema.optional),

  ui: Schema.Struct({
    /** Locale for Liqvid Studio user interface. */
    locale: Locale.pipe(Schema.withDecodingDefaultType(Effect.succeed("en"))),
  }).pipe(Schema.optional),
});

export type LiqvidConfigIn = (typeof LiqvidConfig)["Encoded"];

export type LiqvidConfig = (typeof LiqvidConfig)["Type"];
