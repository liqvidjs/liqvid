import { z } from "zod";

import type { HostingProvider } from "../types.mts";

export const ProviderConfigGitHubPages = z.object({
  repository: z.string(),
  root: z.boolean().optional(),
  username: z.string(),
});
export type ProviderConfigGitHubPages = z.infer<
  typeof ProviderConfigGitHubPages
>;

export class GitHubPagesProvider implements HostingProvider {
  // constructor(_options: ProviderConfigGitHubPages) {}

  async publishContent(): Promise<void> {}
}
