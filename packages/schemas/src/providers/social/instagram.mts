import { z } from "zod";

export const ProviderConfigInstagram = z.object({
  username: z.string(),
});
export type ProviderConfigInstagram = z.infer<typeof ProviderConfigInstagram>;
