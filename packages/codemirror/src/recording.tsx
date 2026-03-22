import type { Extension } from "@codemirror/state";
import { EditorView, keymap, ViewPlugin } from "@codemirror/view";
import { type RecordingPlugin, ReplayDataRecorder } from "@liqvid/recording";
import type { ReplayData } from "@liqvid/utils";
import { bind } from "@liqvid/utils";

import { icon } from "./icon";

import { scrollCmd } from ".";

export type EditorChange = [
  [number, ...(EditorChange | number | string)[]],
  [number, number],
];
export type SpecialKey = string;
export type ScrollAction =
  | [typeof scrollCmd, number, number]
  | [typeof scrollCmd, number];

export type CaptureData = EditorChange | ScrollAction | SpecialKey;

// the actual thingy that gets exported
export class CodeRecorder extends ReplayDataRecorder<CaptureData> {
  constructor() {
    super();
    bind(this, ["extension"]);
  }

  /**
   * Get a CodeMirror extension for recording.
   * @param specialKeys Map of key sequences to commands, e.g. {"Mod-Enter": "run"}.
   * @returns CodeMirror extension.
   */
  extension(specialKeys: Record<string, string> | string[] = {}): Extension {
    // legacy
    if (Array.isArray(specialKeys)) {
      specialKeys = Object.fromEntries(specialKeys.map((key) => [key, key]));
    }

    const $this = this;

    const scrollListener = ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          view.scrollDOM.addEventListener("scroll", () => {
            if (!$this.manager || $this.manager.paused || !$this.manager.active)
              return;
            const time = $this.manager.getTime();

            const fontSize = Number.parseFloat(
              getComputedStyle(view.scrollDOM).getPropertyValue("font-size"),
            );

            // vertical scroll is more common so we put it first and omit
            // horizontal scroll if it's zero
            const action: ScrollAction = [
              scrollCmd,
              view.scrollDOM.scrollTop / fontSize,
              view.scrollDOM.scrollLeft / fontSize,
            ];
            if (action[2] === 0) {
              action.pop();
            }

            $this.capture(time, action);
          });
        }
      },
    );

    // record document changes
    const updateListener = EditorView.updateListener.of((update) => {
      if (this.paused || !this.active) return;

      // get selection change (if any)
      const transactions = update.transactions
        .map((t) => {
          if (!t.selection) return null;
          const range = t.selection.ranges[0];
          return [range.anchor, range.head] as [number, number];
        })
        .filter(Boolean)
        .slice(-1);

      // empty events can break replay
      if (update.changes.empty && transactions.length === 0) return;

      this.capture(this.getTime(), [
        update.changes.toJSON(),
        ...transactions,
        // biome-ignore lint/suspicious/noExplicitAny: TODO
      ] as any);
    });

    // record special key presses
    const keyListener = keymap.of(
      Object.keys(specialKeys).map((key) => ({
        key,
        run: () => {
          if (this.active && !this.paused) {
            this.capture(
              this.getTime(),
              (specialKeys as Record<string, string>)[key],
            );
          }
          return false;
        },
      })),
    );

    return [scrollListener, updateListener, keyListener];
  }
}

const KeySaveComponent: React.FC<{ data: ReplayData<CaptureData> }> = (
  props,
) => {
  return <textarea readOnly value={JSON.stringify(props.data)} />;
};

export const CodeRecording: RecordingPlugin<
  [number, CaptureData],
  ReplayData<CaptureData>,
  CodeRecorder
> = {
  enabled: () => true,
  icon,
  key: "codemirror",
  name: "Code",
  recorder: new CodeRecorder(),
  saveComponent: KeySaveComponent,
  title: "Record code",
};
