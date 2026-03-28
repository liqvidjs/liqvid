import { z } from "zod";

import {
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

export const LiqvidConfig = z.object({
  $schema: z.string().optional(),

  /** Configure your hosting backends */
  backend: z.object({
    /**
     * Provider hosting your content files (html/css/js)
     */
    content: z.enum(["githubPages", "liqvidStudio", "s3", "sftp"]),

    /**
     * Provider hosting your media files (audio, video, and thumbnails)
     */
    media: z.enum(["liqvidStudio", "s3", "sftp"]),
  }),

  /** Files to include when publishing */
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
        "!*.d.ts",
      ]),
    })
    .optional(),

  providers: z.object({
    // social
    bluesky: ProviderConfigBlueSky.optional(),
    facebook: ProviderConfigFacebook.optional(),
    // hosting
    githubPages: ProviderConfigGitHubPages.optional(),
    instagram: ProviderConfigInstagram.optional(),
    liqvidStudio: ProviderConfigLiqvidStudio.optional(),
    s3: ProviderConfigS3.optional(),
    sftp: ProviderConfigSFTP.optional(),
    twitter: ProviderConfigTwitter.optional(),
    youtube: ProviderConfigYouTube.optional(),
  }),
});
export type LiqvidConfig = z.infer<typeof LiqvidConfig>;
