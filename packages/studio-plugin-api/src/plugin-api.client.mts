import type { DurationLike } from "@liqvid/duration";
import { useContext } from "react";

import type { LiqvidStudioPlugin } from "./types.mts";
import { createUniqueContext } from "./utils.client.mts";

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

export const PluginContext = createUniqueContext<PluginContext>(
  "@liqvid/studio-plugin-api/LiqvidStudioPluginApi",
  {
    makeToast() {},
    plugins: {},
    registerInstance: () => () => {},
    setDuration: () => {},
  },
  "LiqvidStudioPluginApi",
);

export function usePluginApi(): PluginContext {
  return useContext(PluginContext);
}
