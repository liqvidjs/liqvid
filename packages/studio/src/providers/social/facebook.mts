import { z } from "zod";

import type { SocialProvider } from "../types.mts";

export const ProviderConfigFacebook = z.object({
  username: z.string(),
});
export type ProviderConfigFacebook = z.infer<typeof ProviderConfigFacebook>;

export class FacebookProvider implements SocialProvider {
  constructor(_options: ProviderConfigFacebook) {}

  async publish() {}
}
