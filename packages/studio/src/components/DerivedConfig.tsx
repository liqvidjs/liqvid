"use client";

import { makeContext } from "@liqvid/utils";

import type { RenderSource } from "../../../schemas/src/shared.mts";

/**
 * values derived from `liqvid.json` configuration that client components need to know
 */
export type DerivedConfig = {
  hasCaptioningConfigured: boolean;

  renderSource: {
    screenshots: RenderSource;
  };
};

const { use: useDerivedConfig, Provider: DerivedConfigProvider } =
  makeContext<DerivedConfig | null>({
    defaultValue: null,
    name: "DerivedConfig",
  });

export { DerivedConfigProvider, useDerivedConfig };
