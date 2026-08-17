import type { ProviderConfigLiqvidStudio } from "@liqvid/schemas";
import { Effect } from "effect";
import type { AbsoluteDir, AbsoluteFile } from "effect-paths";

import type {
  FileDownloadStatus,
  FileUploadStatus,
  MediaHostingProvider,
  RemoteFileInfo,
} from "../types.mts";

export class LiqvidStudioProvider implements MediaHostingProvider {
  // biome-ignore lint/complexity/noUselessConstructor: will implement later
  constructor(_options: ProviderConfigLiqvidStudio) {}

  checkFiles(
    _files: AbsoluteFile[],
    _rootDir: AbsoluteDir,
  ): Effect.Effect<FileUploadStatus[]> {
    return Effect.die(
      new Error("LiqvidStudioProvider.checkFiles not implemented"),
    );
  }

  checkRemoteFiles(
    _remoteFiles: RemoteFileInfo[],
    _rootDir: AbsoluteDir,
  ): Effect.Effect<FileDownloadStatus[]> {
    return Effect.die(
      new Error("LiqvidStudioProvider.checkRemoteFiles not implemented"),
    );
  }

  downloadMedia(_files: FileDownloadStatus[]): Effect.Effect<number> {
    return Effect.die(
      new Error("LiqvidStudioProvider.downloadMedia not implemented"),
    );
  }

  getBaseUrl(): string {
    throw new Error("LiqvidStudioProvider.getBaseUrl not implemented");
  }

  async listRemoteFiles(): Promise<RemoteFileInfo[]> {
    throw new Error("LiqvidStudioProvider.listRemoteFiles not implemented");
  }

  async publishContent(_localDir: string): Promise<void> {}
  publishMedia(
    _localDirs: AbsoluteFile[],
    _rootDir: AbsoluteDir,
  ): Effect.Effect<void> {
    return Effect.die(
      new Error("LiqvidStudioProvider.publishMedia not implemented"),
    );
  }
}
