import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback } from "@liqvid/playback/react";
import { isMac } from "@liqvid/utils";

import { saveCaptions } from "./server.ts";
import type { makeStore } from "./store.ts";
import { apply, redo, undo } from "./utils.ts";

export type Shortcuts = {
  /** Move the cursor one word backward. */
  selectionBackward: string;

  /** Move the cursor one word forward. */
  selectionForward: string;

  /** Move the cursor to the start of the previous sentence. */
  startPrevSentence: string;

  /** Move the cursor to the end of the next sentence. */
  endNextSentence: string;

  /** Move the cursor to the start of the previous caption. */
  startPrevCaption: string;

  /** Move the cursor to the end of the next caption. */
  endNextCaption: string;

  /** Toggle a caption break at the current cursor position. */
  toggleCaptionBreak: string;

  /** Move the cursor to the start of the previous transcript break. */
  startPrevTranscriptBreak: string;

  /** Move the cursor to the end of the next transcript break. */
  endNextTranscriptBreak: string;

  /** Toggle a transcript break at the current cursor position. */
  toggleTranscriptBreak: string;

  /** Seek playback to the start time of the currently selected word. */
  seekToSelection: string;

  /** Save the current captions and transcript. */
  save: string;
};

export const defaultShortcuts: Shortcuts = {
  endNextCaption: "]",
  endNextSentence: ")",
  endNextTranscriptBreak: "}",
  save: "s",
  seekToSelection: "g",
  selectionBackward: "w",
  selectionForward: "e",
  startPrevCaption: "[",
  startPrevSentence: "(",
  startPrevTranscriptBreak: "{",
  toggleCaptionBreak: "\\",
  toggleTranscriptBreak: "|",
};

/** @package */
export function useCaptionsEditorShortcuts(
  store: ReturnType<typeof makeStore>,
  shortcuts: Partial<Shortcuts>,
  projectPath: string,
) {
  const keys = { ...defaultShortcuts, ...shortcuts };
  const playback = usePlayback();

  useEventListener(globalThis?.window, "keydown", (e) => {
    switch (e.key) {
      case keys.selectionBackward:
        store.setState((state) =>
          apply(state, { action: "selection-backward" }),
        );
        break;
      case keys.selectionForward:
        store.setState((state) =>
          apply(state, { action: "selection-forward" }),
        );
        break;
      case keys.startPrevSentence:
        store.setState((state) =>
          apply(state, { action: "start-prev-sentence" }),
        );
        break;
      case keys.endNextSentence:
        store.setState((state) =>
          apply(state, { action: "end-next-sentence" }),
        );
        break;
      case keys.startPrevCaption:
        store.setState((state) =>
          apply(state, { action: "start-prev-caption" }),
        );
        break;
      case keys.endNextCaption:
        store.setState((state) => apply(state, { action: "end-next-caption" }));
        break;
      case keys.toggleCaptionBreak:
        store.setState((state) =>
          apply(state, { action: "toggle-caption-break" }),
        );
        break;
      case keys.startPrevTranscriptBreak:
        store.setState((state) =>
          apply(state, { action: "start-prev-transcript-break" }),
        );
        break;
      case keys.endNextTranscriptBreak:
        store.setState((state) =>
          apply(state, { action: "end-next-transcript-break" }),
        );
        break;
      case keys.toggleTranscriptBreak:
        store.setState((state) =>
          apply(state, { action: "toggle-transcript-break" }),
        );
        break;
      case keys.seekToSelection: {
        const { selection, transcript } = store.getState();
        const word = transcript[selection.start];
        if (word) {
          playback.currentTime$ = { milliseconds: word[1] };
        }
        break;
      }
      case "s": {
        if (!hasModKey(e)) return;
        e.preventDefault();
        const { captionBreaks, transcript } = store.getState();
        saveCaptions({ captionBreaks, projectPath, transcript });
        break;
      }

      case "z":
        if (!hasModKey(e)) return;
        e.preventDefault();

        // Shift+Cmd/Ctrl+Z redoes, matching common editor conventions.
        store.setState((state) => (e.shiftKey ? redo(state) : undo(state)));
        break;
      case "y":
        if (!hasModKey(e)) return;
        e.preventDefault();

        store.setState((state) => redo(state));
        break;
    }
  });
}

/** Returns true if Cmd on Mac, or Ctrl on other platforms, is pressed. */
function hasModKey(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
}
