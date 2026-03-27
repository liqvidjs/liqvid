import type { ProviderConfigLiqvidStudio } from "@liqvid/schemas/providers";

import type { MediaHostingProvider } from "../types.mts";

export class LiqvidStudioProvider implements MediaHostingProvider {
  constructor(_options: ProviderConfigLiqvidStudio) {}

  async publishContent(_localDir: string): Promise<void> {}
  async publishMedia(_localDirs: string[]): Promise<void> {}
}
