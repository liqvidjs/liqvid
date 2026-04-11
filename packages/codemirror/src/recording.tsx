import type { Extension } from "@codemirror/state";
import { EditorView, keymap, ViewPlugin } from "@codemirror/view";
import { ReplayDataRecorder } from "@liqvid/recording";
import type { LiqvidStudioRecordingPlugin } from "@liqvid/studio-plugin-api";
import { bind, mapRecord, type ReplayData } from "@liqvid/utils";

import { ConfigurationComponent } from "./configuration";
import { icon } from "./icon";
import type { CMConfig, CMState } from "./types";

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

export type CodeMirrorInstance = {
  name?: string;
  provideRecorder: (recorder: CodeRecorder | undefined) => void;
};

// the actual thingy that gets exported
export class CodeRecorder extends ReplayDataRecorder<CaptureData, CMState> {
  package = "@lqv/codemirror";
  version = "1.0.0";
  $schema = undefined;
  initial: CMState | undefined = undefined;

  private __config: CMConfig | undefined;

  constructor() {
    super();
    bind(this, ["extension"]);
  }

  configure(config: CMConfig) {
    this.__config = config;
  }

  override beginRecording(timestamp?: number): void {
    if (!this.__config) {
      throw new Error("CodeRecorder has not been configured");
    }

    super.beginRecording(timestamp);

    // capture initial state
    this.initial = {
      activeFile: this.__config.getActiveFile(),
      files: mapRecord(this.__config.views, (view) => {
        const { state } = view;
        return {
          content: state.doc.toString(),
          selection: {
            anchor: state.selection.ranges[0].anchor,
            head: state.selection.ranges[0].head,
          },
        };
      }),
    };
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
            if (!$this.paused || !$this.active) return;
            const time = $this.getTime();

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

export const CodeRecording = {
  configurationComponent: ConfigurationComponent,
  icon,
  name: "Code",
  package: "@lqv/codemirror",
  recorder: new CodeRecorder(),
  version: "1.0.0",
} satisfies LiqvidStudioRecordingPlugin<
  [number, CaptureData],
  ReplayData<CaptureData>,
  unknown,
  CodeMirrorInstance
>;
