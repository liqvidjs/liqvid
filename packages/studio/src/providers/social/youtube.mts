import { z } from "zod";

import type { SocialProvider } from "../types.mts";

export const ProviderConfigYouTube = z.object({
  username: z.string(),
});
export type ProviderConfigYouTube = z.infer<typeof ProviderConfigYouTube>;

export class YouTubeProvider implements SocialProvider {
  async publish() {}
}
