import { z } from "zod";

import type { SocialProvider } from "../types.mts";

export const ProviderConfigTwitter = z.object({
  username: z.string(),
});
export type ProviderConfigTwitter = z.infer<typeof ProviderConfigTwitter>;

export class TwitterProvider implements SocialProvider {
  async publish() {}
}
