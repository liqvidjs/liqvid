import { z } from "zod";

export const ProviderConfigYouTube = z.object({
  username: z.string(),
});
export type ProviderConfigYouTube = z.infer<typeof ProviderConfigYouTube>;
