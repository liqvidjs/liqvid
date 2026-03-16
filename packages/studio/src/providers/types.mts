export interface HostingProvider {
  publishContent(localDir: string): Promise<void>;
}

export interface MediaHostingProvider extends HostingProvider {
  publishMedia(localDir: string): Promise<void>;
}

export interface SocialProvider {
  publish(): Promise<void>;
}
