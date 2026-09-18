import type { TranscriptEntry } from "@liqvid/schemas";

/* ------------------------------ state ------------------------------ */
export type State = Readonly<{
  captionBreaks: readonly number[];

  /** whether the captions editor is open */
  open: boolean;

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
}>;

/* ------------------------------ actions ------------------------------ */
type IdentityAction = Readonly<{
  action: "identity";
}>;

type ChangeWordAction = Readonly<{
  action: "change-word";
  index: number;
  value: string;

  /** The word's previous text, captured at record time so undo can restore it
   * (by undo, `prev` already holds the changed value). */
  prevValue?: string;
}>;

type MergeWordAction = Readonly<{
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
}>;

type DeleteWordAction = Readonly<{
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
}>;

type StartPrevSentenceAction = Readonly<{
  action: "start-prev-sentence";
}>;

type EndNextSentenceAction = Readonly<{
  action: "end-next-sentence";
}>;

type EndNextCommaAction = Readonly<{
  action: "end-next-comma";
}>;

type StartPrevCaptionAction = Readonly<{
  action: "start-prev-caption";
}>;

type EndNextCaptionAction = Readonly<{
  action: "end-next-caption";
}>;

type ToggleCaptionBreakAction = Readonly<{
  action: "toggle-caption-break";
}>;

type StartPrevTranscriptBreakAction = Readonly<{
  action: "start-prev-transcript-break";
}>;

type EndNextTranscriptBreakAction = Readonly<{
  action: "end-next-transcript-break";
}>;

type ToggleTranscriptBreakAction = Readonly<{
  action: "toggle-transcript-break";
}>;

type SetCaptionBreaksAction = Readonly<{
  action: "set-caption-breaks";
  captionBreaks: readonly number[];

  /** The array before applying, captured at record time for undo. */
  prevCaptionBreaks?: readonly number[];
}>;

type SetTranscriptBreaksAction = Readonly<{
  action: "set-transcript-breaks";
  transcriptBreaks: readonly number[];

  /** The array before applying, captured at record time for undo. */
  prevTranscriptBreaks?: readonly number[];
}>;

type InsertWordAction = Readonly<{
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
}>;

type SelectionBackwardAction = Readonly<{
  action: "selection-backward";
}>;

type SelectionSetAction = Readonly<{
  action: "selection-set";
  selection: TranscriptSelection;
}>;

type SelectionForwardAction = Readonly<{
  action: "selection-forward";
}>;

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
type TranscriptSelection = Readonly<{
  start: number;

  end: number;
}>;

export type Transcript = readonly TranscriptEntry[];
