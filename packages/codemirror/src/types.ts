import type { EditorView } from "@codemirror/view";

export interface CMRange {
  anchor: number;
  head: number;
}

export type CMConfig = {
  views: Record<string, EditorView>;
};

export type CMState = {
  files: {
    [filename: string]: {
      content: string;
      selection: CMRange;
    };
  };
};
