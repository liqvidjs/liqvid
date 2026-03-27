import type { ProviderConfigBlueSky } from "@liqvid/schemas/providers";

import type { SocialProvider } from "../types.mts";

export class BlueSkyProvider implements SocialProvider {
  constructor(_options: ProviderConfigBlueSky) {}

  async publish() {}
}
