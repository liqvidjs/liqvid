import type { ChangeSet } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { RecordingData } from "@liqvid/recording";
import type { ReplayData } from "@liqvid/utils";

import type { ScrollAction } from "./recording.tsx";

/** Possible replay commands. */
export type Action =
  | ScrollAction
  | string
  | [changes: ChangeSet, selection?: CMRangeArray];

export interface CMRange {
  anchor: number;
  head: number;
}

export type CMRangeArray = [anchor: number, head: number];

export type CMConfig = {
  getActiveFile(): string | undefined;
  views: Record<string, EditorView>;
};

export type CMState = {
  /** The initially active file. */
  activeFile: string;
  files: {
    [filename: string]: {
      content?: string;
      selection?: CMRange;
    };
  };
};

/** Recording data for multi-file replay. */
export type MultiFileRecording = RecordingData<ReplayData<Action>, CMState>;
