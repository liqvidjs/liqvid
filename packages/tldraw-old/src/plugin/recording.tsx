import {RecorderPlugin, ReplayDataRecorder, compress} from "@liqvid/recording";
import {bind} from "@liqvid/utils/misc";
import type {ReplayData} from "@liqvid/utils/replay-data";
import type {Editor, HistoryEntry, TLShape} from "@tldraw/tldraw";
import {compressChanges} from "./compression";
import type {ReplayState, TldrawEvent} from "./types";

export class TldrawRecorder extends ReplayDataRecorder<TldrawEvent> {
  #editor: Editor | undefined;
  #unlisten: (() => void) | undefined;
  #shapeCache: Map<string, TLShape> = new Map();
  #initialState: ReplayState | undefined;

  constructor() {
    super();
    bind(this, ["captureEvent"]);
  }

  beginRecording(): void {
    // DO NOT FORGET TO CALL super
    super.beginRecording();

    if (!this.#editor) {
      throw new Error("TldrawRecorder: editor not provided");
    }

    this.#initialState = {
      pointer: {x: 0, y: 0, tool: this.#editor.getCurrentToolId()},
      snapshot: this.#editor.store.getSnapshot("all"),
    };
    this.#unlisten = this.#editor.store.listen(this.captureEvent);
  }

  endRecording(): void {
    this.#unlisten?.();
    this.#shapeCache.clear();
  }

  provideEditor(editor: Editor) {
    this.#editor = editor;
  }

  captureEvent({changes}: HistoryEntry): void {
    if (!this.#editor) return;

    const t = this.manager.getTime();

    if (this.manager.paused) return;

    for (const compressed of compressChanges(changes, this.#shapeCache)) {
      this.capture(t, compressed);
    }
  }

  finalizeRecording(data: ReplayData<TldrawEvent>): any {
    const initialState = this.#initialState!;
    this.#initialState = undefined;

    return {
      version: "1.0",
      initialState,
      data,//: compress(data, 4),
    };
  }

  setTool(tool: string) {
    if (!this.manager || this.manager.paused) return;

    this.capture(this.manager.getTime(), tool);
  }
}

const TldrawSaveComponent: React.FC<{data: ReplayData<TldrawEvent>}> = (
  props,
) => {
  return (
    <>
      {props.data ? (
        <textarea readOnly value={JSON.stringify(props.data)}></textarea>
      ) : (
        "Tldraw data not yet available."
      )}
    </>
  );
};

const icon = (
  <g transform="scale(5)" viewBox="0 0 18 18">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 1.97802C0 0.88559 0.848303 0 1.89474 0H16.1053C17.1517 0 18 0.885591 18 1.97802V16.022C18 17.1144 17.1517 18 16.1053 18H1.89474C0.848303 18 0 17.1144 0 16.022V1.97802ZM10.6264 5.14801C10.6264 5.58302 10.4777 5.95212 10.1803 6.25531C9.88296 6.5585 9.52095 6.71009 9.0943 6.71009C8.65471 6.71009 8.28624 6.5585 7.98888 6.25531C7.69151 5.95212 7.54283 5.58302 7.54283 5.14801C7.54283 4.71301 7.69151 4.34391 7.98888 4.04072C8.28624 3.73753 8.65471 3.58594 9.0943 3.58594C9.52095 3.58594 9.88296 3.73753 10.1803 4.04072C10.4777 4.34391 10.6264 4.71301 10.6264 5.14801ZM7.52344 10.6224C7.52344 10.1874 7.67212 9.81831 7.96948 9.51512C8.27978 9.19875 8.65471 9.04056 9.0943 9.04056C9.50802 9.04056 9.87003 9.19875 10.1803 9.51512C10.4906 9.81831 10.6716 10.161 10.7233 10.5433C10.8268 11.2552 10.6975 11.9604 10.3355 12.659C9.98639 13.3577 9.48216 13.8916 8.82279 14.2607C8.46078 14.4716 8.16342 14.465 7.9307 14.2409C7.71091 14.03 7.77555 13.7795 8.12463 13.4895C8.31856 13.3445 8.48017 13.16 8.60946 12.9359C8.73875 12.7118 8.82279 12.4811 8.86158 12.2438C8.87451 12.1384 8.82925 12.0856 8.72582 12.0856C8.46725 12.0724 8.2022 11.9274 7.9307 11.6506C7.65919 11.3738 7.52344 11.0311 7.52344 10.6224Z"
      fill="#fff"
    />
  </g>
);

export const TldrawRecording: RecorderPlugin<
  [number, TldrawEvent],
  ReplayData<TldrawEvent>,
  TldrawRecorder
> = {
  icon,
  key: "tldraw",
  name: "Tldraw",
  recorder: new TldrawRecorder(),
  saveComponent: TldrawSaveComponent,
  title: "Record Tldraw",
};
