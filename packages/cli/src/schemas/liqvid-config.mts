import { z } from "zod";

import { ProviderConfigS3 } from "../providers/hosting/s3.mts";

/**
 * Configuration for media hosting backend.
 * Currently only S3-compatible providers are supported.
 */
export const LiqvidConfig = z.object({
  $schema: z.string().optional(),

  /** Configure your media hosting backend */
  media: z.object({
    /**
     * Provider type for hosting media files.
     * Currently only "s3" is supported.
     */
    provider: z.literal("s3"),

    /** S3 configuration */
    s3: ProviderConfigS3,
  }),
});
export type LiqvidConfig = z.infer<typeof LiqvidConfig>;
