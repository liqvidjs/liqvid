import { z } from "zod";

export const ProviderConfigTwitter = z.object({
  username: z.string(),
});
export type ProviderConfigTwitter = z.infer<typeof ProviderConfigTwitter>;
