"use client";

import { createElement, lazy, Suspense, useMemo, useState } from "react";

import type { PluginContext } from "./plugin-api.client.mts";
import type { LiqvidStudioPlugin } from "./types.mts";

export { type PluginContext, usePluginApi } from "./plugin-api.client.mts";

export const LiqvidStudioPluginApiProvider = (
  props: React.ComponentProps<typeof LiqvidStudioPluginApiProviderInner>,
) => (
  <Suspense fallback={null}>
    <LiqvidStudioPluginApiProviderInner {...props} />
  </Suspense>
);

export const LiqvidStudioPluginApiProviderInner = lazy(() =>
  import("./plugin-api.client.mts").then((mod) => ({
    default: function LiqvidStudioPluginApiProvider({
      children,
      plugins: propPlugins,
      value,
    }: {
      children?: React.ReactNode;
      plugins?: readonly LiqvidStudioPlugin[];
      value?: Partial<PluginContext>;
    }) {
      const [plugins] = useState<Record<string, LiqvidStudioPlugin>>(() =>
        Object.fromEntries((propPlugins ?? []).map((p) => [p.package, p])),
      );

      const context = useMemo(
        (): PluginContext => ({
          makeToast() {},
          get plugins() {
            return plugins;
          },
          registerInstance: () => () => {},
          setDuration: () => {},
          ...value,
        }),
        [plugins, value],
      );

      return createElement(
        mod.PluginContext.Provider,
        { value: context },
        children,
      );
    },
  })),
);
