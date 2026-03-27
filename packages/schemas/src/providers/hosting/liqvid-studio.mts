import { z } from "zod";

export const ProviderConfigLiqvidStudio = z.object({
  username: z.string(),
});
export type ProviderConfigLiqvidStudio = z.infer<
  typeof ProviderConfigLiqvidStudio
>;
