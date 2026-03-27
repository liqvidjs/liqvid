import * as fsp from "node:fs/promises";
import * as path from "node:path";

import {
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { fromIni } from "@aws-sdk/credential-providers";
import { z } from "zod";

import type { MediaHostingProvider } from "../types.mts";

/** Reference an environment variable */
const EnvVar = z.templateLiteral(["{env:", z.string(), "}"]);
type EnvVar = z.infer<typeof EnvVar>;

/**
 * Resolve an environment variable reference to its actual value.
 */
function resolveEnvVar(envVar: EnvVar): string {
  const match = envVar.match(/^\{env:(.+)\}$/);
  if (!match) {
    throw new Error(`Invalid environment variable reference: ${envVar}`);
  }
  const varName = match[1];
  const value = process.env[varName];
  if (value === undefined) {
    throw new Error(`Environment variable ${varName} is not set`);
  }
  return value;
}

/** Configuration for Cloudflare R2 */
const CloudflareR2Config = z.object({
  accountId: EnvVar.optional().default(`{env:CLOUDFLARE_ACCOUNT_ID}`),
  apiToken: EnvVar.optional().default(`{env:CLOUDFLARE_API_TOKEN}`),
});

/** Non-S3 host providing an S3-compatible API, e.g. Cloudflare R2 */
const ExoticS3ProviderConfig = z.object({
  cloudflareR2: CloudflareR2Config.optional(),
});

/** Authentication via AWS profile */
const S3AuthConfig = z.object({
  profile: z.string(),
});

/** Configuration for AWS S3 (or other compatible provider) */
export const ProviderConfigS3 = z.object({
  auth: z.union([S3AuthConfig, ExoticS3ProviderConfig]),
  bucket: z.string(),
  prefix: z.string().optional(),
  region: z.string().optional(),
});
export type ProviderConfigS3 = z.infer<typeof ProviderConfigS3>;

/** Content type mapping for common media files */
const CONTENT_TYPES: Record<string, string> = {
  // Video
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".weba": "audio/webm",
  // Images
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  // Data
  ".json": "application/json",
  ".xml": "application/xml",
  // HTML/CSS/JS
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** AWS S3, or other compatible provider */
export class S3Provider implements MediaHostingProvider {
  private client: S3Client;
  private bucket: string;
  private prefix: string;
  private config: ProviderConfigS3;

  constructor(config: ProviderConfigS3) {
    this.config = config;
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? "";
    this.client = this.createClient();
  }

  private createClient(): S3Client {
    const { auth, region } = this.config;

    // Check if using Cloudflare R2
    if ("cloudflareR2" in auth && auth.cloudflareR2) {
      const r2Config = auth.cloudflareR2;
      const accountId = resolveEnvVar(r2Config.accountId);
      const apiToken = resolveEnvVar(r2Config.apiToken);

      return new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: apiToken,
          secretAccessKey: apiToken,
        },
      });
    }

    // Standard AWS S3 with profile
    if ("profile" in auth) {
      return new S3Client({
        region: region ?? "us-east-1",
        credentials: fromIni({ profile: auth.profile }),
      });
    }

    // Fallback to default credentials
    return new S3Client({
      region: region ?? "us-east-1",
    });
  }

  async publishContent(localDir: string): Promise<void> {
    await this.uploadDirectory(localDir);
  }

  async publishMedia(localDirs: string[]): Promise<void> {
    for (const localDir of localDirs) {
      await this.uploadDirectory(localDir);
    }
  }

  /**
   * Upload all files from a local directory to S3
   */
  private async uploadDirectory(localDir: string): Promise<void> {
    const files = await this.getAllFiles(localDir);

    console.log(`Uploading ${files.length} files to s3://${this.bucket}...`);

    for (const filePath of files) {
      const relativePath = path.relative(localDir, filePath);
      const key = this.buildKey(relativePath);

      await this.uploadFile(filePath, key);
    }

    console.log(`Upload complete.`);
  }

  /**
   * Recursively get all files in a directory
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fsp.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.getAllFiles(fullPath)));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Build the S3 key for a file
   */
  private buildKey(relativePath: string): string {
    const parts: string[] = [];

    if (this.prefix) {
      parts.push(this.prefix);
    }

    parts.push(relativePath);

    // Normalize path separators to forward slashes for S3
    return parts.join("/").replace(/\\/g, "/");
  }

  /**
   * Upload a single file to S3 using multipart upload for large files
   */
  private async uploadFile(filePath: string, key: string): Promise<void> {
    const fileContent = await fsp.readFile(filePath);
    const contentType = getContentType(filePath);

    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    };

    // Use multipart upload for better reliability
    const upload = new Upload({
      client: this.client,
      params,
    });

    await upload.done();
    console.log(`  Uploaded: ${key}`);
  }
}
