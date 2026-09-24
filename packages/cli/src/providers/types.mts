import type { Progress } from "@liqvid/renderer";
import type { Effect, FileSystem, PlatformError } from "effect";
import type { AbsoluteDir, AbsoluteFile, RelativeFile } from "effect-paths";

export type ProgressService = typeof Progress extends {
  readonly Service: infer Service;
}
  ? Service
  : never;

export interface HostingProvider {
  /** Get the value of the `NEXT_PUBLIC_LIQVID_CONTENT_BASE` environment variable. */
  getContentBaseUrl():
    | string
    | Effect.Effect<string, unknown, FileSystem.FileSystem>;

  publishContent(
    localDir: AbsoluteDir,
    force?: boolean,
    projectDir?: AbsoluteDir,
  ): Effect.Effect<
    void,
    PlatformError.PlatformError,
    FileSystem.FileSystem | ProgressService
  >;
}

export type FileUploadStatus = Readonly<{
  /** Absolute path to the local file */
  filePath: AbsoluteFile;

  /** Remote key/path */
  key: RelativeFile;

  /** Whether the file needs to be uploaded */
  needsUpload: boolean;

  /** Reason for the upload status */
  reason: "new" | "modified" | "unchanged";
}>;

export type RemoteFileInfo = Readonly<{
  /** Remote key/path (relative to prefix) */
  key: RelativeFile;

  /** Last modified date */
  lastModified: Date;

  /** Size in bytes */
  size: number;
}>;

export type FileDownloadStatus = Readonly<{
  /** Remote key/path */
  key: RelativeFile;

  /** Absolute path where the file will be saved locally */
  localPath: AbsoluteFile;

  /** Whether the file needs to be downloaded */
  needsDownload: boolean;

  /** Reason for the download status */
  reason: "new" | "modified" | "unchanged";
}>;

export interface MediaHostingProvider {
  /**
   * Check which files need to be uploaded.
   * @param files - Absolute paths to the media files
   * @param rootDir - The root directory (for computing relative paths)
   * @returns Upload status for each file
   */
  checkFiles(
    files: readonly AbsoluteFile[],
    rootDir: AbsoluteDir,
  ): Effect.Effect<FileUploadStatus[], unknown, FileSystem.FileSystem>;

  /**
   * Check which remote files need to be downloaded.
   * @param remoteFiles - List of remote file info
   * @param rootDir - The local root directory where files will be saved
   * @returns Download status for each file
   */
  checkRemoteFiles(
    remoteFiles: readonly RemoteFileInfo[],
    rootDir: AbsoluteDir,
  ): Effect.Effect<FileDownloadStatus[], unknown, FileSystem.FileSystem>;

  /**
   * Download media files from the hosting provider.
   * @param files - Download statuses for files to download
   * @returns Number of files downloaded
   */
  downloadMedia(
    files: readonly FileDownloadStatus[],
  ): Effect.Effect<number, unknown, FileSystem.FileSystem>;

  /** Get the value of the `NEXT_PUBLIC_LIQVID_MEDIA_BASE` environment variable. */
  getMediaBaseUrl():
    | string
    | Effect.Effect<string, unknown, FileSystem.FileSystem>;

  /**
   * List all remote files under the configured prefix.
   * @returns List of remote file info
   */
  listRemoteFiles(): Effect.Effect<
    RemoteFileInfo[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  >;

  /**
   * Publish media files to the hosting provider.
   * @param files - Absolute paths to the media files
   * @param rootDir - The root directory (for computing relative paths)
   */
  publishMedia(
    files: readonly AbsoluteFile[],
    rootDir: AbsoluteDir,
    force?: boolean,
  ): Effect.Effect<
    void,
    PlatformError.PlatformError,
    FileSystem.FileSystem | ProgressService
  >;
}
