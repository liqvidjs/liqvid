import { Effect, Schema } from "effect";
import { SchemaAnyDir } from "effect-paths";

import { SchemaUrl } from "../../shared.mts";

/**
 * Destination for the copy provider.
 * Can be a single directory path, or separate paths for hosting vs media mode.
 */
export const CopyDestination = Schema.Union([
  SchemaAnyDir,
  Schema.Struct({
    hosting: SchemaAnyDir,
    media: SchemaAnyDir,
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
    Schema.annotate({
      default: false,
      description: "Whether to clean the destination directory before copying.",
    }),
  ),

  /**
   * The destination to copy to.
   * Can be either a directory path, or an object with separate paths for hosting vs media.
   */
  destination: CopyDestination.pipe(
    Schema.annotate({
      description:
        "The destination to copy to. Can be either a directory path, or an object with separate paths for hosting vs media.",
    }),
  ),

  /**
   * Domain content will be hosted at.
   * Currently, this is only used for the "copy embed code" button.
   */
  domain: SchemaUrl.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        'Domain content will be hosted at. Currently, this is only used for the "copy embed code" button.',
    }),
  ),
});
export type ProviderConfigCopy = (typeof ProviderConfigCopy)["Type"];
