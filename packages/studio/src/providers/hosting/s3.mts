import { z } from "zod";

import type { MediaHostingProvider } from "../types.mts";

export const ProviderConfigS3 = z.object({
  bucket: z.string(),
  prefix: z.string().optional(),
});
export type ProviderConfigS3 = z.infer<typeof ProviderConfigS3>;

export class S3Provider implements MediaHostingProvider {
  async publishContent(): Promise<void> {}
  async publishMedia(): Promise<void> {}
}
