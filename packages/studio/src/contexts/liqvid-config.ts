"use client";

import type { RootParameters } from "@liqvid/schemas";
import { makeContext } from "@liqvid/utils";

type ClientSideLiqvidConfig = {
  domain: string;
  basePath: string;
  hideProjects: readonly string[];
  productionServerPort: number;
  rootParameters: RootParameters;
};

const { use: useLiqvidConfig, Provider: LiqvidConfigProvider } =
  makeContext<ClientSideLiqvidConfig>({
    defaultValue: {
      basePath: "",
      domain: "http://localhost:4000",
      hideProjects: [],
      productionServerPort: 4000,
      rootParameters: {},
    },
    name: "LiqvidConfig",
  });

export { LiqvidConfigProvider, useLiqvidConfig };
