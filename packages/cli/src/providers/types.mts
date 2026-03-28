export interface HostingProvider {
  publishContent(localDir: string): Promise<void>;
}

export interface MediaHostingProvider {
  /** Get the value of the `NEXT_PUBLIC_LIQVID_MEDIA_BASE` environment variable. */
  getBaseUrl(): string;

  /**
   * Publish media files to the hosting provider.
   * @param files - Absolute paths to the media files
   * @param rootDir - The root directory (for computing relative paths)
   */
  publishMedia(files: string[], rootDir: string): Promise<void>;
}
