import type { ProviderConfigGitHubPages } from "@liqvid/schemas/providers";

import type { HostingProvider } from "../types.mts";

export class GitHubPagesProvider implements HostingProvider {
  constructor(_options: ProviderConfigGitHubPages) {}

  async publishContent(_localDir: string): Promise<void> {}
}
