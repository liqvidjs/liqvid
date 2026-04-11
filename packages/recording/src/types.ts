import type { JSX } from "react";

import type { Recorder } from "./recorder";

export interface RecordingPlugin<
  T = unknown,
  F = T[],
  R extends Recorder<T, F> = Recorder<T, F>,
> {
  /** SVG icon for plugin. */
  icon: (props: JSX.IntrinsicElements["svg"]) => JSX.Element;

  /** Name of the package providing this plugin. */
  package: string;

  /** Name for plugin. */
  name: string;

  /** Recorder component for plugin. */
  recorder: R;

  /** Optional title. */
  title?: string;
}

export type RecordingData<Data, State> = {
  /** Optional schema URL for validating this recording. */
  $schema?: string;

  /** Name of the plugin that created this recording. */
  package: string;

  /** Version of the plugin that created this recording. */
  version: string;

  /** Optional initial state for replaying this recording. */
  initial?: State;

  /** Recording data to replay. */
  data: Data;
};
