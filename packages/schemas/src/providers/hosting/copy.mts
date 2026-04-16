import { z } from "zod";

/**
 * Destination for the copy provider.
 * Can be a single directory path, or separate paths for hosting vs media mode.
 */
export const CopyDestination = z.union([
  z.string(),
  z.object({
    hosting: z.string(),
    media: z.string(),
  }),
]);
export type CopyDestination = z.infer<typeof CopyDestination>;

/**
 * Configuration for the copy provider.
 * Copies the output directory to another location on disk.
 */
export const ProviderConfigCopy = z.object({
  /**
   * Whether to clean the destination directory before copying.
   * @default false
   */
  clean: z.boolean().default(false).optional(),

  /**
   * The destination to copy to.
   * Can be either a directory path, or an object with separate paths for hosting vs media.
   */
  destination: CopyDestination,
});
export type ProviderConfigCopy = z.infer<typeof ProviderConfigCopy>;
