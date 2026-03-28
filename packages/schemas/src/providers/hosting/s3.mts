import { z } from "zod";

import { EnvVar, StringWithEnvVars } from "../../shared.mts";

/** Authentication via AWS profile */
export const S3ProfileAuth = z.object({
  profile: z.string(),
  type: z.literal("profile"),
});
export type S3ProfileAuth = z.infer<typeof S3ProfileAuth>;

/** Explicit S3 credentials authentication */
export const S3ExplicitAuth = z.object({
  /**
   * Access key ID. For security, can only be specified via env var.
   *
   * @default {env:AWS_ACCESS_KEY_ID}
   */
  accessKeyId: EnvVar.optional().default(`{env:AWS_ACCESS_KEY_ID}`),

  /**
   * Domain at which to access content. It is strongly recommended to use
   * a cache (e.g. AWS CloudFront or CloudFlare R2 Custom Domain) instead
   * of serving content directly.
   */
  domain: z.string(),

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
  type: z.literal("explicit"),
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

  /** Bucket name */
  bucket: z.string(),

  /**
   * Domain at which to access content. It is strongly recommended to use
   * a cache (e.g. AWS CloudFront or CloudFlare R2 Custom Domain) instead
   * of serving content directly.
   */
  domain: z.string(),

  /** Prefix to apply to all content from this project */
  prefix: z.string().optional(),

  region: z.string().optional(),
});
export type ProviderConfigS3 = z.infer<typeof ProviderConfigS3>;
