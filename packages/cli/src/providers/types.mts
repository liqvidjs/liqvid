export interface HostingProvider {
  publishContent(localDir: string): Promise<void>;
}

export interface MediaHostingProvider extends HostingProvider {
  /**
   * Publish media directories to the hosting provider.
   * @param localDirs - Absolute paths to the .liqvid directories
   * @param rootDir - The root directory of the project (for computing relative paths)
   */
  publishMedia(localDirs: string[], rootDir: string): Promise<void>;
}
