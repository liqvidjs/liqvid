import { Effect, Schema } from "effect";

/**
 * Destination for the copy provider.
 * Can be a single directory path, or separate paths for hosting vs media mode.
 */
export const CopyDestination = Schema.Union([
  Schema.String,
  Schema.Struct({
    hosting: Schema.String,
    media: Schema.String,
  }),
]);
export type CopyDestination = (typeof CopyDestination)["Type"];

/**
 * Configuration for the copy provider.
 * Copies the output directory to another location on disk.
 */
export const ProviderConfigCopy = Schema.Struct({
  /**
   * Whether to clean the destination directory before copying.
   * @default false
   */
  clean: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),

  /**
   * The destination to copy to.
   * Can be either a directory path, or an object with separate paths for hosting vs media.
   */
  destination: CopyDestination,
});
export type ProviderConfigCopy = (typeof ProviderConfigCopy)["Type"];
