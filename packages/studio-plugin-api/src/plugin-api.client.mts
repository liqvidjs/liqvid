import type { DurationLike } from "@liqvid/duration";
import { useContext, useSyncExternalStore } from "react";

import type { LiqvidStudioPlugin } from "./types.mts";
import { createUniqueContext } from "./utils.client.mts";

export interface PluginContext {
  getInstances: (pluginName: string) => readonly unknown[];
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
  subscribeInstances: (pluginName: string, listener: () => void) => () => void;
}

const EMPTY_INSTANCES: readonly unknown[] = Object.freeze([]);

export const PluginContext = createUniqueContext<PluginContext>(
  "@liqvid/studio-plugin-api/LiqvidStudioPluginApi",
  {
    getInstances: () => EMPTY_INSTANCES,
    makeToast() {},
    plugins: {},
    registerInstance: () => () => {},
    setDuration: () => {},
    subscribeInstances: () => () => {},
  },
  "LiqvidStudioPluginApi",
);

export function usePluginApi(): PluginContext {
  return useContext(PluginContext);
}

export function useRegisteredInstances<T>(pluginName: string): readonly T[] {
  const { getInstances, subscribeInstances } = usePluginApi();
  return useSyncExternalStore(
    (listener) => subscribeInstances(pluginName, listener),
    () => getInstances(pluginName) as readonly T[],
    () => EMPTY_INSTANCES as readonly T[],
  );
}
