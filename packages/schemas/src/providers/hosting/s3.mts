import { z } from "zod";

import { EnvVar, StringWithEnvVars } from "../../shared.mts";

/** Authentication via AWS profile */
export const S3ProfileAuth = z.object({
  type: z.literal("profile"),
  profile: z.string(),
});
export type S3ProfileAuth = z.infer<typeof S3ProfileAuth>;

/** Explicit S3 credentials authentication */
export const S3ExplicitAuth = z.object({
  type: z.literal("explicit"),

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
export type S3ExplicitAuth = z.infer<typeof S3ExplicitAuth>;

/** S3 authentication config - discriminated union */
export const S3Auth = z.discriminatedUnion("type", [
  S3ProfileAuth,
  S3ExplicitAuth,
]);
export type S3Auth = z.infer<typeof S3Auth>;

/** Configuration for AWS S3 (or other compatible provider) */
export const ProviderConfigS3 = z.object({
  auth: S3Auth,
  bucket: z.string(),
  prefix: z.string().optional(),
  region: z.string().optional(),
});
export type ProviderConfigS3 = z.infer<typeof ProviderConfigS3>;
