import { z } from "zod";

export const ProviderConfigBlueSky = z.object({
  username: z.string(),
});
export type ProviderConfigBlueSky = z.infer<typeof ProviderConfigBlueSky>;
