import type { ProviderConfigTwitter } from "@liqvid/schemas/providers";

import type { SocialProvider } from "../types.mts";

export type { ProviderConfigTwitter } from "@liqvid/schemas/providers";

export class TwitterProvider implements SocialProvider {
  constructor(_options: ProviderConfigTwitter) {}

  async publish() {}
}
