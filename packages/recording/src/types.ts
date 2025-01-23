import type {Recorder} from "./recorder";

export interface RecordingPlugin<
  T = unknown,
  F = T[],
  R extends Recorder<T, F> = Recorder<T, F>,
> {
  enabled?: () => boolean;

  /** SVG icon for plugin. */
  icon: JSX.Element;

  /** Unique key for plugin. */
  key: string;

  /** Name for plugin. */
  name: string;

  /** Recorder component for plugin. */
  recorder: R;

  /** Save component. */
  saveComponent: React.FC<{data: F}>;

  /** Optional title. */
  title?: string;
}

export {RecordingPlugin as RecorderPlugin};
