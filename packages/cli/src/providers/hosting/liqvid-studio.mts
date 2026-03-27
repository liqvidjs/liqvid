import { z } from "zod";

export const ProviderConfigLiqvidStudio = z.object({
  username: z.string(),
});
export type ProviderConfigLiqvidStudio = z.infer<
  typeof ProviderConfigLiqvidStudio
>;

import type { MediaHostingProvider } from "../types.mts";

export class LiqvidStudioProvider implements MediaHostingProvider {
  async publishContent(_localDir: string): Promise<void> {}
  async publishMedia(_localDirs: string[]): Promise<void> {}
}
