import { z } from "zod";

export const ProviderConfigFacebook = z.object({
  username: z.string(),
});
export type ProviderConfigFacebook = z.infer<typeof ProviderConfigFacebook>;
