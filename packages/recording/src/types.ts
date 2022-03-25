import type {Recorder} from "./recorder";

export interface RecorderPlugin<T = unknown, F = T[], R extends Recorder<T, F> = Recorder<T, F>> {
  enabled?: () => boolean;
  icon: JSX.Element;
  key: string;
  name: string;
  recorder: R;
  saveComponent: React.FC<{data: F}>;
  title?: string;
}
