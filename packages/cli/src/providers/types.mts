export interface HostingProvider {
  publishContent(localDir: string): Promise<void>;
}

export interface FileUploadStatus {
  /** Absolute path to the local file */
  filePath: string;
  /** Remote key/path */
  key: string;
  /** Whether the file needs to be uploaded */
  needsUpload: boolean;
  /** Reason for the upload status */
  reason: "new" | "modified" | "unchanged";
}

export interface MediaHostingProvider {
  /**
   * Check which files need to be uploaded.
   * @param files - Absolute paths to the media files
   * @param rootDir - The root directory (for computing relative paths)
   * @returns Upload status for each file
   */
  checkFiles(files: string[], rootDir: string): Promise<FileUploadStatus[]>;

  /** Get the value of the `NEXT_PUBLIC_LIQVID_MEDIA_BASE` environment variable. */
  getBaseUrl(): string;

  /**
   * Publish media files to the hosting provider.
   * @param files - Absolute paths to the media files
   * @param rootDir - The root directory (for computing relative paths)
   */
  publishMedia(files: string[], rootDir: string): Promise<void>;
}
