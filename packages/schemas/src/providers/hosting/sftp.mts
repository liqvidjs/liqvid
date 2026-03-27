import { z } from "zod";

export const ProviderConfigSFTP = z.object({
  host: z.string(),
  path: z.string(),
});
export type ProviderConfigSFTP = z.infer<typeof ProviderConfigSFTP>;
