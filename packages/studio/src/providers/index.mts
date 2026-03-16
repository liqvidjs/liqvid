import { GitHubPagesProvider } from "./hosting/github-pages.mts";
import { LiqvidStudioProvider } from "./hosting/liqvid-studio.mts";
import { S3Provider } from "./hosting/s3.mts";
import { SFTPProvider } from "./hosting/sftp.mts";

export const providersMap = {
  githubPages: GitHubPagesProvider,
  liqvidStudio: LiqvidStudioProvider,
  s3: S3Provider,
  sftp: SFTPProvider,
};
