import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { type PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { Upload } from "@aws-sdk/lib-storage";
import type { ProviderConfigS3 } from "@liqvid/schemas/providers";

import type { MediaHostingProvider } from "../types.mts";

/**
 * Resolve an environment variable reference to its actual value.
 * Matches exact env var references like `{env:VAR_NAME}`.
 */
function resolveEnvVar(envVar: string): string {
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

/**
 * Interpolate all environment variable references in a string.
 * Replaces all `{env:VAR_NAME}` patterns with their values.
 */
function interpolateEnvVars(str: string): string {
  return str.replace(/\{env:([^}]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return value;
  });
}

/** Content type mapping for common media files */
const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".gif": "image/gif",

  // HTML/CSS/JS
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",

  // Data
  ".json": "application/json",
  ".m4a": "audio/mp4",
  ".mjs": "application/javascript",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",

  // Audio
  ".mp3": "audio/mpeg",

  // Video
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",

  // Images
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".xml": "application/xml",
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

    // Debug: log auth config to understand which branch is taken
    console.log("[S3Provider] Auth config:", JSON.stringify(auth, null, 2));

    // AWS profile-based authentication
    if ("profile" in auth) {
      const endpoint =
        "endpoint" in auth && auth.endpoint
          ? interpolateEnvVars(auth.endpoint)
          : undefined;

      return new S3Client({
        credentials: fromIni({ profile: auth.profile }),
        endpoint,
        region: endpoint ? "auto" : (region ?? "us-east-1"),
      });
    }

    // Explicit credentials (accessKeyId/secretAccessKey)
    if ("accessKeyId" in auth) {
      const accessKeyId = resolveEnvVar(auth.accessKeyId);
      const secretAccessKey = resolveEnvVar(auth.secretAccessKey);

      // Handle endpoint with env var interpolation
      const endpoint = auth.endpoint
        ? interpolateEnvVars(auth.endpoint)
        : undefined;

      return new S3Client({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint,
        // When using a custom endpoint (like R2), set region to "auto"
        region: endpoint ? "auto" : (auth.region ?? region ?? "us-east-1"),
      });
    }

    // Fallback to default credentials (from environment/IAM role)
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
      Body: fileContent,
      Bucket: this.bucket,
      ContentType: contentType,
      Key: key,
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
