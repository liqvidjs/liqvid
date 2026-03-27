export interface HostingProvider {
  publishContent(localDir: string): Promise<void>;
}

export interface MediaHostingProvider extends HostingProvider {
  publishMedia(localDirs: string[]): Promise<void>;
}
