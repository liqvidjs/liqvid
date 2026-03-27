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
