import type { EditorView } from "@codemirror/view";

export interface CMRange {
  anchor: number;
  head: number;
}

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
