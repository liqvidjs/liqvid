import type { Recorder } from "@liqvid/recording";
import type { Brand } from "effect";
import type { RelativeFile } from "effect-paths";
import type { JSX } from "react";

/** valid name for a recording */
export type RecordingName = string & Brand.Brand<"RecordingName">;

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

export type ConfigurationComponentProps<Instance> = {
  instances: Set<Instance>;
};

export type RecordingFiles = {
  /** Test whether a relative file path is present. */
  has: (filename: string) => boolean;

  /** List files relative to the plugin's recording directory. */
  list: () => readonly string[];
};

export type RecordingComponentProps = {
  /** Name of the recording */
  name: RecordingName;

  /** Files relative to this plugin's directory in the recording. */
  files: RecordingFiles;

  /** Load a text file relative to this plugin's directory. */
  loadFile: (filename: RelativeFile) => Promise<string>;
};

export interface LiqvidStudioRecordingPlugin<
  Datum,
  FinalData = Datum[],
  Config = unknown,
  Instance = unknown,
> extends LiqvidStudioPluginBase {
  configurationComponent?: (
    props: ConfigurationComponentProps<Instance>,
  ) => React.ReactNode;

  recorder: Recorder<Datum, FinalData, Config>;

  recordingComponent?: (props: RecordingComponentProps) => React.ReactNode;

  useConfigurePlugin?: () => void;
}

// biome-ignore lint/suspicious/noExplicitAny: variance
export type LiqvidStudioPlugin = LiqvidStudioRecordingPlugin<any, any, any>;
