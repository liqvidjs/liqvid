import type { ProviderConfigFacebook } from "@liqvid/schemas/providers";

import type { SocialProvider } from "../types.mts";

export type { ProviderConfigFacebook } from "@liqvid/schemas/providers";

export class FacebookProvider implements SocialProvider {
  constructor(_options: ProviderConfigFacebook) {}

  async publish() {}
}
