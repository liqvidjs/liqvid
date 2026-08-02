import type { AbsoluteDir, AbsoluteFile, RelativeFile } from "effect-paths";

export interface HostingProvider {
  publishContent(localDir: string): Promise<void>;
}

export interface FileUploadStatus {
  /** Absolute path to the local file */
  filePath: AbsoluteFile;

  /** Remote key/path */
  key: RelativeFile;

  /** Whether the file needs to be uploaded */
  needsUpload: boolean;

  /** Reason for the upload status */
  reason: "new" | "modified" | "unchanged";
}

export interface RemoteFileInfo {
  /** Remote key/path (relative to prefix) */
  key: RelativeFile;

  /** Size in bytes */
  size: number;

  /** Last modified date */
  lastModified: Date;
}

export interface FileDownloadStatus {
  /** Remote key/path */
  key: RelativeFile;

  /** Absolute path where the file will be saved locally */
  localPath: AbsoluteFile;

  /** Whether the file needs to be downloaded */
  needsDownload: boolean;

  /** Reason for the download status */
  reason: "new" | "modified" | "unchanged";
}

export interface MediaHostingProvider {
  /**
   * Check which files need to be uploaded.
   * @param files - Absolute paths to the media files
   * @param rootDir - The root directory (for computing relative paths)
   * @returns Upload status for each file
   */
  checkFiles(
    files: AbsoluteFile[],
    rootDir: AbsoluteDir,
  ): Promise<FileUploadStatus[]>;

  /**
   * Check which remote files need to be downloaded.
   * @param remoteFiles - List of remote file info
   * @param rootDir - The local root directory where files will be saved
   * @returns Download status for each file
   */
  checkRemoteFiles(
    remoteFiles: RemoteFileInfo[],
    rootDir: string,
  ): Promise<FileDownloadStatus[]>;

  /**
   * Download media files from the hosting provider.
   * @param files - Download statuses for files to download
   * @returns Number of files downloaded
   */
  downloadMedia(files: FileDownloadStatus[]): Promise<number>;

  /** Get the value of the `NEXT_PUBLIC_LIQVID_MEDIA_BASE` environment variable. */
  getBaseUrl(): string;

  /**
   * List all remote files under the configured prefix.
   * @returns List of remote file info
   */
  listRemoteFiles(): Promise<RemoteFileInfo[]>;

  /**
   * Publish media files to the hosting provider.
   * @param files - Absolute paths to the media files
   * @param rootDir - The root directory (for computing relative paths)
   */
  publishMedia(files: AbsoluteFile[], rootDir: AbsoluteDir): Promise<void>;
}
