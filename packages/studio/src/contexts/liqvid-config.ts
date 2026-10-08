"use client";

import type { ParameterConfig } from "@liqvid/schemas";
import { makeContext } from "@liqvid/utils";
import { AbsoluteDir } from "effect-paths";

import {
  DEFAULT_PREVIEW_SERVER_CONFIG,
  getPreviewServerOrigin,
  type PreviewServerConfig,
} from "./preview-server-config.ts";

type ClientSideLiqvidConfig = Readonly<{
  domain: string;
  basePath: string;
  hideProjects: readonly string[];
  logging: Readonly<{ dir: string }>;
  previewServer: PreviewServerConfig;
  rootParameters: ParameterConfig;
  /** Absolute filesystem path of the Next.js `app` directory. */
  routesDir: AbsoluteDir;
}>;

const { use: useLiqvidConfig, Provider: LiqvidConfigProvider } =
  makeContext<ClientSideLiqvidConfig>({
    defaultValue: {
      basePath: "",
      domain: getPreviewServerOrigin(DEFAULT_PREVIEW_SERVER_CONFIG),
      hideProjects: [],
      logging: { dir: "logs" },
      previewServer: DEFAULT_PREVIEW_SERVER_CONFIG,
      rootParameters: {},
      routesDir: AbsoluteDir("/"),
    },
    name: "LiqvidConfig",
  });

export { LiqvidConfigProvider, useLiqvidConfig };
