import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback } from "@liqvid/playback/react";
import { isMac } from "@liqvid/utils";

import type { Store } from "./store.ts";
import { activeWordIndex, apply, redo, undo } from "./utils.ts";

export type Shortcuts = {
  /** Cycle the capitalization of the currently selected word. */
  cycleCapitalization: string;

  /** Delete the currently selected word. */
  deleteWord: string;

  /** Edit the currently selected word. */
  editWord: string;

  /** Move the cursor to the end of the next caption. */
  endNextCaption: string;

  /** Move the cursor to the next word ending in a comma. */
  endNextComma: string;

  /** Move the cursor to the end of the next sentence. */
  endNextSentence: string;

  /** Move the cursor to the end of the next transcript break. */
  endNextTranscriptBreak: string;

  /** Merge the following word into the currently selected word. */
  mergeFollowing: string;

  /** Save the current captions and transcript. */
  save: string;

  /** Seek playback to the start time of the currently selected word. */
  seekToSelection: string;

  /** Move the selection to the word active at the current playback time. */
  selectCurrentWord: string;

  /** Move the cursor one word backward. */
  selectionBackward: string;

  /** Move the cursor one word forward. */
  selectionForward: string;

  /** Move the cursor to the start of the previous caption. */
  startPrevCaption: string;

  /** Move the cursor to the start of the previous sentence. */
  startPrevSentence: string;

  /** Move the cursor to the start of the previous transcript break. */
  startPrevTranscriptBreak: string;

  /** Toggle a caption break at the current cursor position. */
  toggleCaptionBreak: string;

  /** Toggle a transcript break at the current cursor position. */
  toggleTranscriptBreak: string;
};

export const defaultShortcuts: Shortcuts = {
  cycleCapitalization: "~",
  deleteWord: "Backspace",
  editWord: "c",
  endNextCaption: "]",
  endNextComma: ",",
  endNextSentence: ")",
  endNextTranscriptBreak: "}",
  mergeFollowing: "M",
  save: "s",
  seekToSelection: "g",
  selectCurrentWord: "h",
  selectionBackward: "w",
  selectionForward: "e",
  startPrevCaption: "[",
  startPrevSentence: "(",
  startPrevTranscriptBreak: "{",
  toggleCaptionBreak: "\\",
  toggleTranscriptBreak: "|",
};

/**
 * The order in which shortcuts are displayed, and which ones require the
 * platform modifier key (Cmd on macOS, Ctrl elsewhere).
 */
export const shortcutList: { key: keyof Shortcuts; mod?: boolean }[] = [
  { key: "selectionBackward" },
  { key: "selectionForward" },
  { key: "startPrevSentence" },
  { key: "endNextSentence" },
  { key: "endNextComma" },
  { key: "startPrevCaption" },
  { key: "endNextCaption" },
  { key: "toggleCaptionBreak" },
  { key: "startPrevTranscriptBreak" },
  { key: "endNextTranscriptBreak" },
  { key: "toggleTranscriptBreak" },
  { key: "seekToSelection" },
  { key: "selectCurrentWord" },
  { key: "editWord" },
  { key: "deleteWord" },
  { key: "mergeFollowing" },
  { key: "cycleCapitalization" },
  { key: "save", mod: true },
];

/** Human-friendly label for a special key name, or the key itself. */
const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  Backspace: "⌫",
  Delete: "Del",
  Enter: "↵",
  Escape: "Esc",
};

/**
 * Splits a shortcut into the sequence of keys to render as separate `<kbd>`s,
 * prepending the platform modifier when required. A single uppercase letter
 * (which requires Shift to type, e.g. `"M"`) is shown as `Shift` + the letter.
 */
export function formatShortcut(key: string, mod = false): string[] {
  const tokens: string[] = [];
  if (mod) tokens.push(isMac ? "⌘" : "Ctrl");

  // A single uppercase letter is only produced by holding Shift.
  if (key.length === 1 && key >= "A" && key <= "Z") tokens.push("Shift");

  tokens.push(KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key));
  return tokens;
}

/** @package Wire up shortcuts for the captions editor */
export function useCaptionsEditorShortcuts(
  store: Store,
  shortcuts: Partial<Shortcuts>,
  {
    editWord,
    save,
  }: {
    editWord: () => void;
    save: () => Promise<void>;
  },
) {
  const keys = { ...defaultShortcuts, ...shortcuts };
  const playback = usePlayback();

  useEventListener(globalThis?.window, "keydown", (e) => {
    // Ignore shortcuts while typing in an input/textarea/contenteditable (e.g.
    // the inline word editor), which handles its own keys.
    if (isEditableTarget(e.target)) return;

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
      case keys.endNextComma:
        store.setState((state) => apply(state, { action: "end-next-comma" }));
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
        const { selection, words: transcript } = store.getState();
        const word = transcript[selection.start];
        if (word) {
          playback.currentTime$ = { milliseconds: word[1] };
        }
        break;
      }
      case keys.selectCurrentWord:
        store.setState((state) => {
          const t = playback.currentTime$.inMilliseconds();
          const index = activeWordIndex(state.words, t);
          if (index < 0) return state;

          return apply(state, {
            action: "selection-set",
            selection: { end: index, start: index },
          });
        });
        break;
      case keys.deleteWord:
        store.setState((state) => {
          if (state.words.length === 0) return state;
          return apply(state, {
            action: "delete-word",
            index: state.selection.start,
          });
        });
        break;
      case keys.mergeFollowing:
        store.setState((state) => {
          const index = state.selection.start;
          // Nothing to merge if there is no following word.
          if (index >= state.words.length - 1) return state;
          return apply(state, { action: "merge-word", index });
        });
        break;
      case keys.cycleCapitalization:
        store.setState((state) => {
          const index = state.selection.start;
          const word = state.words[index]?.[0];
          if (word === undefined) return state;

          const value = cycleCapitalization(word);
          if (value === word) return state;

          return apply(state, { action: "change-word", index, value });
        });
        break;
      case keys.editWord:
        // Prevent the key from being typed into the input we're about to open.
        e.preventDefault();
        editWord();
        break;
      case "s": {
        if (!hasModKey(e)) return;
        e.preventDefault();
        save();
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

/**
 * Cycles the capitalization of a word.
 *
 * When the word starts with a letter there are three states, cycled in order:
 * 1. lowercase initial → capitalize the initial letter;
 * 2. capitalized (but not all caps) → ALL CAPS;
 * 3. ALL CAPS → all lowercase.
 *
 * When the word starts with a non-letter there are only two states, cycled
 * between ALL CAPS and all lowercase.
 */
export function cycleCapitalization(word: string): string {
  if (word.length === 0) return word;

  const lower = word.toLowerCase();
  const upper = word.toUpperCase();
  const first = word[0]!;
  const startsWithLetter = first.toLowerCase() !== first.toUpperCase();

  // All-caps words (that contain at least one cased letter) always cycle to
  // lowercase next, regardless of the initial character.
  if (word === upper && word !== lower) return lower;

  if (startsWithLetter) {
    const capitalized = first.toUpperCase() + word.slice(1);

    // Lowercase initial → capitalize the initial letter.
    if (first === first.toLowerCase()) return capitalized;

    // Capitalized (but not all caps, handled above) → ALL CAPS.
    return upper;
  }

  // Starts with a non-letter: only lowercase ⇄ ALL CAPS. Anything that is not
  // already all-caps becomes all-caps.
  return upper;
}

/** Returns true if Cmd on Mac, or Ctrl on other platforms, is pressed. */
function hasModKey(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
}

/** Whether the event target is a text-editable element. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
