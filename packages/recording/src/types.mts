import type { JSX } from "react";

import type { Recorder } from "./recorder.mts";

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
