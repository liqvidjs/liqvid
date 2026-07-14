import type { TranscriptEntry } from "@liqvid/cli/transcribe";

/* ------------------------------ state ------------------------------ */
export type State = {
  captionBreaks: number[];

  selection: TranscriptSelection;

  stack: readonly Action[];

  transcript: readonly TranscriptEntry[];
};

/* ------------------------------ actions ------------------------------ */
export type IdentityAction = {
  action: "identity";
};

export type ChangeWordAction = {
  action: "change-word";
  index: number;
  value: string;
};

export type DeleteWordAction = {
  action: "delete-word";
  index: number;
};

export type StartPrevSentenceAction = {
  action: "start-prev-sentence";
};

export type EndNextSentenceAction = {
  action: "end-next-sentence";
};

export type StartPrevCaptionAction = {
  action: "start-prev-caption";
};

export type EndNextCaptionAction = {
  action: "end-next-caption";
};

export type ToggleCaptionBreakAction = {
  action: "toggle-caption-break";
};

export type InsertWordAction = {
  action: "insert-word";
  index: number;
  value: string;

  startTime: number;
  endTime: number;
};

export type SelectionBackwardAction = {
  action: "selection-backward";
};

export type SelectionSetAction = {
  action: "selection-set";
  selection: TranscriptSelection;
};

export type SelectionForwardAction = {
  action: "selection-forward";
};

export type Action =
  | ChangeWordAction
  | DeleteWordAction
  | EndNextCaptionAction
  | EndNextSentenceAction
  | IdentityAction
  | InsertWordAction
  | SelectionBackwardAction
  | SelectionForwardAction
  | SelectionSetAction
  | StartPrevCaptionAction
  | StartPrevSentenceAction
  | ToggleCaptionBreakAction;

/* ------------------------------ misc types ------------------------------ */
export type TranscriptSelection = {
  start: number;

  end: number;
};

export type Transcript = readonly TranscriptEntry[];
