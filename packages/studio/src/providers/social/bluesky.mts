import type { ProviderConfigBlueSky } from "@liqvid/schemas/providers";

import type { SocialProvider } from "../types.mts";

export type { ProviderConfigBlueSky } from "@liqvid/schemas/providers";

export class BlueSkyProvider implements SocialProvider {
  constructor(_options: ProviderConfigBlueSky) {}

  async publish() {}
}
