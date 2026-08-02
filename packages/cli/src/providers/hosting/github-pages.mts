import type { ProviderConfigGitHubPages } from "@liqvid/schemas";

import type { HostingProvider } from "../types.mts";

export class GitHubPagesProvider implements HostingProvider {
  // biome-ignore lint/complexity/noUselessConstructor: will implement later
  constructor(_options: ProviderConfigGitHubPages) {}

  async publishContent(_localDir: string): Promise<void> {}
}
