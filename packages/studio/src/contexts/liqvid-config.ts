"use client";

import type { RootParameters } from "@liqvid/schemas";
import { makeContext } from "@liqvid/utils";

type ClientSideLiqvidConfig = {
  basePath: string;
  productionServerPort: number;
  rootParameters: RootParameters;
};

const { use: useLiqvidConfig, Provider: LiqvidConfigProvider } =
  makeContext<ClientSideLiqvidConfig>({
    defaultValue: {
      basePath: "",
      productionServerPort: 4000,
      rootParameters: {},
    },
    name: "LiqvidConfig",
  });

export { LiqvidConfigProvider, useLiqvidConfig };
