import { z } from "zod";

import { EnvVar, StringWithEnvVars } from "../../shared.mts";

/** Authentication via AWS profile */
export const S3ProfileConfig = z.object({
  profile: z.string(),
});
export type S3ProfileConfig = z.infer<typeof S3ProfileConfig>;

/** Explicit S3 configuration */
export const S3ExplicitConfig = z.object({
  /**
   * Access key ID. For security, can only be specified via env var.
   *
   * @default {env:AWS_ACCESS_KEY_ID}
   */
  accessKeyId: EnvVar.optional().default(`{env:AWS_ACCESS_KEY_ID}`),

  /**
   * S3-compatible endpoint URL. May contain env var interpolations.
   * E.g. `"https://{env:CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"`
   */
  endpoint: StringWithEnvVars.optional(),

  /**
   * AWS region
   *
   * @default us-east-1
   */
  region: z.string().optional().default("us-east-1"),

  /**
   * Secret access key. For security, can only be specified via env var.
   *
   * @default {env:AWS_SECRET_ACCESS_KEY}
   */
  secretAccessKey: EnvVar.optional().default(`{env:AWS_SECRET_ACCESS_KEY}`),
});
export type S3ExplicitConfig = z.infer<typeof S3ExplicitConfig>;

/** Configuration for AWS S3 (or other compatible provider) */
export const ProviderConfigS3 = z.object({
  auth: z.union([S3ProfileConfig, S3ExplicitConfig]),
  bucket: z.string(),
  prefix: z.string().optional(),
  region: z.string().optional(),
});
export type ProviderConfigS3 = z.infer<typeof ProviderConfigS3>;
