import type { ProviderConfigInstagram } from "@liqvid/schemas/providers";

import type { SocialProvider } from "../types.mts";

export class InstagramProvider implements SocialProvider {
  constructor(_options: ProviderConfigInstagram) {}

  async publish() {}
}
