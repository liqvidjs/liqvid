"use client";

import type { DurationLike } from "@liqvid/duration";
import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useState,
} from "react";

import type { LiqvidStudioPlugin } from "./types.mts";

export interface PluginContext {
  /** Display a toast message */
  makeToast: (props: {
    message?: React.ReactNode;
    title: React.ReactNode;
    type?: "info" | "negative" | "success";
  }) => void;

  plugins: Record<string, LiqvidStudioPlugin>;

  registerInstance: <T>(pluginName: string, instance: T) => () => void;

  /** Set the duration of the current project */
  setDuration: (duration: DurationLike) => void;
}

const PluginContext = createContext<PluginContext>({
  makeToast() {},
  plugins: {},
  registerInstance: () => () => {},
  setDuration: () => {},
});
PluginContext.displayName = "LiqvidStudioPluginApi";

export function usePluginApi(): PluginContext {
  return useContext(PluginContext);
}

export function LiqvidStudioPluginApiProvider({
  children,
  plugins: propPlugins,
  value,
}: {
  children?: React.ReactNode;
  plugins?: LiqvidStudioPlugin[];
  value?: Partial<PluginContext>;
}) {
  const [plugins, setPlugins] = useState<Record<string, LiqvidStudioPlugin>>(
    () => Object.fromEntries((propPlugins ?? []).map((p) => [p.package, p])),
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

  return createElement(PluginContext.Provider, { value: context }, children);
}
