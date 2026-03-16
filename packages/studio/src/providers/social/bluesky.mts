import { z } from "zod";

import type { SocialProvider } from "../types.mts";

export const ProviderConfigBlueSky = z.object({
  username: z.string(),
});
export type ProviderConfigBlueSky = z.infer<typeof ProviderConfigBlueSky>;

export class BlueSkyProvider implements SocialProvider {
  constructor(_options: ProviderConfigBlueSky) {}

  async publish() {}
}
