export type PreviewServerConfig = Readonly<{
  enabled: boolean;
  hostname: string;
  port: number;
}>;

export const DEFAULT_PREVIEW_SERVER_CONFIG = {
  enabled: false,
  hostname: "localhost",
  port: 4000,
} as const satisfies PreviewServerConfig;

export function getPreviewServerOrigin({
  hostname,
  port,
}: PreviewServerConfig): string {
  return `http://${hostname}:${port}`;
}
