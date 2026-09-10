import { isMac } from "@liqvid/utils";

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
export function hasModKey(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
}

/** Whether the event target is a text-editable element. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
