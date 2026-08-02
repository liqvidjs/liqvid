// import type { ProviderConfigLiqvidStudio } from "@liqvid/schemas";

import type {
  FileDownloadStatus,
  FileUploadStatus,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

export class LiqvidStudioProvider implements MediaHostingProvider {
  // constructor(_options: ProviderConfigLiqvidStudio) {}

  async checkFiles(
    _files: string[],
    _rootDir: string,
  ): Promise<FileUploadStatus[]> {
    throw new Error("LiqvidStudioProvider.checkFiles not implemented");
  }

  async checkRemoteFiles(
    _remoteFiles: RemoteFileInfo[],
    _rootDir: string,
  ): Promise<FileDownloadStatus[]> {
    throw new Error("LiqvidStudioProvider.checkRemoteFiles not implemented");
  }

  async downloadMedia(_files: FileDownloadStatus[]): Promise<number> {
    throw new Error("LiqvidStudioProvider.downloadMedia not implemented");
  }

  getBaseUrl(): string {
    throw new Error("LiqvidStudioProvider.getBaseUrl not implemented");
  }

  async listRemoteFiles(): Promise<RemoteFileInfo[]> {
    throw new Error("LiqvidStudioProvider.listRemoteFiles not implemented");
  }

  async publishContent(_localDir: string): Promise<void> {}
  async publishMedia(_localDirs: string[], _rootDir: string): Promise<void> {}
}
