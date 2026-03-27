import { z } from "zod";

/** Reference an environment variable */
export const EnvVar = z.templateLiteral(["{env:", z.string(), "}"]);
export type EnvVar = z.infer<typeof EnvVar>;

/** Configuration for Cloudflare R2 */
export const CloudflareR2Config = z.object({
  accountId: EnvVar.optional().default(`{env:CLOUDFLARE_ACCOUNT_ID}`),
  apiToken: EnvVar.optional().default(`{env:CLOUDFLARE_API_TOKEN}`),
});
export type CloudflareR2Config = z.infer<typeof CloudflareR2Config>;

/** Non-S3 host providing an S3-compatible API, e.g. Cloudflare R2 */
export const ExoticS3ProviderConfig = z.object({
  cloudflareR2: CloudflareR2Config.optional(),
});
export type ExoticS3ProviderConfig = z.infer<typeof ExoticS3ProviderConfig>;

/** Authentication via AWS profile */
export const S3AuthConfig = z.object({
  profile: z.string(),
});
export type S3AuthConfig = z.infer<typeof S3AuthConfig>;

/** Configuration for AWS S3 (or other compatible provider) */
export const ProviderConfigS3 = z.object({
  auth: z.union([S3AuthConfig, ExoticS3ProviderConfig]),
  bucket: z.string(),
  prefix: z.string().optional(),
  region: z.string().optional(),
});
export type ProviderConfigS3 = z.infer<typeof ProviderConfigS3>;
