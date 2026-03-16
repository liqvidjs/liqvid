import { z } from "zod";

import type { SocialProvider } from "../types.mts";

export const ProviderConfigInstagram = z.object({
  username: z.string(),
});
export type ProviderConfigInstagram = z.infer<typeof ProviderConfigInstagram>;

export class InstagramProvider implements SocialProvider {
  constructor(_options: ProviderConfigInstagram) {}

  async publish() {}
}
