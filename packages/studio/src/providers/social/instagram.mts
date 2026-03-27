import type { ProviderConfigInstagram } from "@liqvid/schemas/providers";

import type { SocialProvider } from "../types.mts";

export type { ProviderConfigInstagram } from "@liqvid/schemas/providers";

export class InstagramProvider implements SocialProvider {
  constructor(_options: ProviderConfigInstagram) {}

  async publish() {}
}
