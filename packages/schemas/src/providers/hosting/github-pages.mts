import { z } from "zod";

export const ProviderConfigGitHubPages = z.object({
  repository: z.string(),
  root: z.boolean().optional(),
  username: z.string(),
});
export type ProviderConfigGitHubPages = z.infer<
  typeof ProviderConfigGitHubPages
>;
