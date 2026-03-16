import { z } from "zod";

import { ProviderConfigGitHubPages } from "../providers/hosting/github-pages.mts";
import { ProviderConfigLiqvidStudio } from "../providers/hosting/liqvid-studio.mts";
import { ProviderConfigS3 } from "../providers/hosting/s3.mts";
import { ProviderConfigSFTP } from "../providers/hosting/sftp.mts";
import { ProviderConfigBlueSky } from "../providers/social/bluesky.mts";
import { ProviderConfigFacebook } from "../providers/social/facebook.mts";
import { ProviderConfigInstagram } from "../providers/social/instagram.mts";
import { ProviderConfigTwitter } from "../providers/social/twitter.mts";
import { ProviderConfigYouTube } from "../providers/social/youtube.mts";

export const LiqvidConfig = z.object({
  $schema: z.string(),
  backend: z.object({
    content: z.enum(["githubPages", "liqvidStudio", "s3", "sftp"]),
    media: z.enum(["liqvidStudio", "s3", "sftp"]),
  }),
  providers: z.object({
    // hosting
    githubPages: ProviderConfigGitHubPages.optional(),
    liqvidStudio: ProviderConfigLiqvidStudio.optional(),
    s3: ProviderConfigS3.optional(),
    sftp: ProviderConfigSFTP.optional(),

    // social
    ...{
      bluesky: ProviderConfigBlueSky.optional(),
      facebook: ProviderConfigFacebook.optional(),
      instagram: ProviderConfigInstagram.optional(),
      twitter: ProviderConfigTwitter.optional(),
      youtube: ProviderConfigYouTube.optional(),
    },
  }),
});
export type LiqvidConfig = z.infer<typeof LiqvidConfig>;
