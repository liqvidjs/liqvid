import type { ProviderConfigYouTube } from "@liqvid/schemas/providers";

import type { SocialProvider } from "../types.mts";

export type { ProviderConfigYouTube } from "@liqvid/schemas/providers";

export class YouTubeProvider implements SocialProvider {
  constructor(_options: ProviderConfigYouTube) {}

  async publish() {}
}
