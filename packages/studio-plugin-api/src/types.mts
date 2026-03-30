import type { Recorder } from "@liqvid/recording";
import type { JSX } from "react";

export interface LiqvidStudioPluginBase {
  /** SVG icon for the plugin */
  icon: (props?: JSX.IntrinsicElements["svg"]) => JSX.Element;

  /** Display name for the plugin */
  name: string;

  /** Name of the package providing this plugin. */
  package: string;

  /** Version string for the plugin */
  version: string;
}

export interface LiqvidStudioRecordingPlugin<
  Datum,
  FinalData = Datum[],
  Config = unknown,
  Instance = unknown,
> extends LiqvidStudioPluginBase {
  configurationComponent?: (props: {
    instances: Set<Instance>;
  }) => React.ReactNode;

  recordingComponent?: (props: {
    /** Name of the recording */
    name: string;
  }) => React.ReactNode;

  recorder: Recorder<Datum, FinalData, Config>;

  useConfigurePlugin?: () => void;
}

// biome-ignore lint/suspicious/noExplicitAny: variance
export type LiqvidStudioPlugin = LiqvidStudioRecordingPlugin<any, any, any>;
