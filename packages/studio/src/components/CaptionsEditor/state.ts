import type { TranscriptEntry } from "@liqvid/schemas";

/* ------------------------------ state ------------------------------ */
export type State = {
  captionBreaks: readonly number[];

  /** Indices where a transcript break (`<br>`) is rendered. Independent of
   * caption breaks. */
  paragraphBreaks: readonly number[];

  selection: TranscriptSelection;

  /** Actions that have been applied, in order, for undo. */
  undoStack: readonly Action[];

  /** Actions that have been undone, for redo. */
  redoStack: readonly Action[];

  /**
   * The transcript entries, in order. Initially these correspond to single words,
   * but after editing they could contain whitespace.
   */
  words: readonly TranscriptEntry[];
};

/* ------------------------------ actions ------------------------------ */
type IdentityAction = {
  action: "identity";
};

type ChangeWordAction = {
  action: "change-word";
  index: number;
  value: string;

  /** The word's previous text, captured at record time so undo can restore it
   * (by undo, `prev` already holds the changed value). */
  prevValue?: string;
};

type MergeWordAction = {
  action: "merge-word";
  index: number;

  /**
   * The two merged entries (`index` and `index + 1`) and the break arrays
   * before merging, captured at record time so undo can restore them exactly
   * (by undo, `prev` holds the merged word and shifted breaks).
   */
  prevEntries?: readonly [TranscriptEntry, TranscriptEntry];
  prevCaptionBreaks?: readonly number[];
  prevParagraphBreaks?: readonly number[];
};

type DeleteWordAction = {
  action: "delete-word";
  index: number;

  /** The removed entry, captured at record time so undo can reinsert it. */
  deleted?: TranscriptEntry;

  /**
   * The break arrays before deletion, captured at record time so undo can
   * restore them exactly (deletion may drop a break that shifting cannot
   * recover).
   */
  prevCaptionBreaks?: readonly number[];
  prevParagraphBreaks?: readonly number[];
};

type StartPrevSentenceAction = {
  action: "start-prev-sentence";
};

type EndNextSentenceAction = {
  action: "end-next-sentence";
};

type EndNextCommaAction = {
  action: "end-next-comma";
};

type StartPrevCaptionAction = {
  action: "start-prev-caption";
};

type EndNextCaptionAction = {
  action: "end-next-caption";
};

type ToggleCaptionBreakAction = {
  action: "toggle-caption-break";
};

type StartPrevTranscriptBreakAction = {
  action: "start-prev-transcript-break";
};

type EndNextTranscriptBreakAction = {
  action: "end-next-transcript-break";
};

type ToggleTranscriptBreakAction = {
  action: "toggle-transcript-break";
};

type SetCaptionBreaksAction = {
  action: "set-caption-breaks";
  captionBreaks: readonly number[];

  /** The array before applying, captured at record time for undo. */
  prevCaptionBreaks?: readonly number[];
};

type SetTranscriptBreaksAction = {
  action: "set-transcript-breaks";
  transcriptBreaks: readonly number[];

  /** The array before applying, captured at record time for undo. */
  prevTranscriptBreaks?: readonly number[];
};

type InsertWordAction = {
  action: "insert-word";
  index: number;
  value: string;

  startTime: number;
  endTime: number;

  /**
   * Break arrays to restore verbatim. Used when inverting a `delete-word`,
   * which may have removed a break that plain index shifting cannot recover.
   * When omitted, breaks at or after `index` are shifted up by one.
   */
  captionBreaks?: readonly number[];
  paragraphBreaks?: readonly number[];

  /**
   * When set, also overwrite the word immediately before the insertion
   * (`words[index - 1]`) with this entry. Used when inverting a `merge-word`
   * to split the merged word back into its two originals.
   */
  restorePrev?: TranscriptEntry;
};

type SelectionBackwardAction = {
  action: "selection-backward";
};

type SelectionSetAction = {
  action: "selection-set";
  selection: TranscriptSelection;
};

type SelectionForwardAction = {
  action: "selection-forward";
};

export type Action =
  | ChangeWordAction
  | DeleteWordAction
  | EndNextCaptionAction
  | EndNextCommaAction
  | EndNextSentenceAction
  | EndNextTranscriptBreakAction
  | IdentityAction
  | InsertWordAction
  | MergeWordAction
  | SelectionBackwardAction
  | SelectionForwardAction
  | SelectionSetAction
  | SetCaptionBreaksAction
  | SetTranscriptBreaksAction
  | StartPrevCaptionAction
  | StartPrevSentenceAction
  | StartPrevTranscriptBreakAction
  | ToggleCaptionBreakAction
  | ToggleTranscriptBreakAction;

/* ------------------------------ misc types ------------------------------ */
type TranscriptSelection = {
  start: number;

  end: number;
};

export type Transcript = readonly TranscriptEntry[];
