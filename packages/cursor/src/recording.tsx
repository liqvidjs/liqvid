import {
  compress,
  type RecorderPlugin,
  ReplayDataRecorder,
} from "@liqvid/recording";
import { bind } from "@liqvid/utils/misc";
import type { ReplayData } from "@liqvid/utils/replay-data";

export class CursorRecorder extends ReplayDataRecorder<[number, number]> {
  /** Container element for recording. */
  target = document.body;

  constructor() {
    super();
    bind(this, ["captureMouse"]);
  }

  beginRecording(): void {
    // DO NOT FORGET TO CALL super
    super.beginRecording();
    document.body.addEventListener("mousemove", this.captureMouse);
  }

  endRecording(): void {
    document.body.removeEventListener("mousemove", this.captureMouse);
  }

  captureMouse(e: MouseEvent): void {
    const t = this.manager.getTime();

    if (this.manager.paused) return;

    const { left, top, height, width } = this.target.getBoundingClientRect();

    this.capture(t, [
      ((e.pageX - left) / width) * 100,
      ((e.pageY - top) / height) * 100,
    ] as [number, number]);
  }

  finalizeRecording(
    data: ReplayData<[number, number]>,
  ): ReplayData<[number, number]> {
    return compress(data, 4);
  }
}

const CursorSaveComponent: React.FC<{ data: ReplayData<[number, number]> }> = (
  props,
) => {
  return (
    <>
      {props.data ? (
        <textarea readOnly value={JSON.stringify(props.data)}></textarea>
      ) : (
        "Cursor data not yet available."
      )}
    </>
  );
};

const icon = (
  <g>
    <line x1="0" x2="100" y1="50" y2="50" stroke="#FFF" />
    <line x1="50" x2="50" y1="0" y2="100" stroke="#FFF" />
  </g>
);

export const CursorRecording: RecorderPlugin<
  [number, [number, number]],
  ReplayData<[number, number]>,
  CursorRecorder
> = {
  icon,
  key: "cursor",
  name: "Cursor",
  recorder: new CursorRecorder(),
  saveComponent: CursorSaveComponent,
  title: "Record cursor",
};
