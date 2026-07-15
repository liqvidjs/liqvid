import type { Action, State } from "./state.ts";

/**
 * Applies an action to a state and returns the new state.
 */
export function apply(prev: State, action: Action, append = true): State {
  if (action.action === "identity") return prev;

  const next = { ...prev };

  switch (action.action) {
    case "change-word":
      next.words = prev.words.map((entry, i) =>
        i === action.index ? [action.value, entry[1], entry[2]] : entry,
      );
      break;

    case "delete-word": {
      next.words = prev.words.filter((_, i) => i !== action.index);

      // Collapse the selection onto the word that now occupies the deleted
      // slot (the following word), or the previous word when the last word was
      // deleted. Clamp to a valid index for the shortened transcript.
      const index = Math.max(0, Math.min(action.index, next.words.length - 1));
      next.selection = { end: index, start: index };
      break;
    }

    case "start-prev-sentence": {
      let i = prev.selection.start - 2;
      for (; i >= 0; --i) {
        if (prev.words[i]![0].endsWith(".")) {
          i++;
          break;
        }
      }

      i = Math.max(i, 0);

      next.selection = { end: i, start: i };
      break;
    }

    case "end-next-sentence": {
      let i = prev.selection.end + 1;
      for (; i < prev.words.length; ++i) {
        if (prev.words[i]![0].endsWith(".")) break;
      }

      i = Math.min(i, prev.words.length - 1);

      next.selection = { end: i, start: i };
      break;
    }

    case "start-prev-caption": {
      // Caption starts are 0 and each caption break index. Jump to the
      // largest caption start strictly before the current selection start,
      // falling back to 0.
      for (let i = prev.captionBreaks.length - 1; i >= 0; --i) {
        const breakIndex = prev.captionBreaks[i]!;
        if (breakIndex + 1 >= prev.selection.start) continue;

        const index = prev.captionBreaks[i]! + 1;

        return { ...prev, selection: { end: index, start: index } };
      }

      next.selection = { end: 0, start: 0 };
      break;
    }

    case "end-next-caption": {
      // Caption ends are the caption break indices. Jump to the smallest
      // caption break strictly after the current selection end, falling back
      // to the last word.
      let i = prev.words.length - 1;
      for (const breakIndex of prev.captionBreaks) {
        if (breakIndex > prev.selection.end) {
          i = breakIndex;
          break;
        }
      }

      next.selection = { end: i, start: i };
      break;
    }

    case "toggle-caption-break": {
      const index = prev.selection.end;

      next.captionBreaks = prev.captionBreaks.includes(index)
        ? prev.captionBreaks.filter((breakIndex) => breakIndex !== index)
        : [...prev.captionBreaks, index].sort((a, b) => a - b);
      break;
    }

    case "toggle-transcript-break": {
      const index = prev.selection.end;

      next.paragraphBreaks = prev.paragraphBreaks.includes(index)
        ? prev.paragraphBreaks.filter((breakIndex) => breakIndex !== index)
        : [...prev.paragraphBreaks, index].sort((a, b) => a - b);
      break;
    }

    case "start-prev-transcript-break": {
      // Jump to the word after the largest transcript break strictly before
      // the current selection start, falling back to 0.
      for (let i = prev.paragraphBreaks.length - 1; i >= 0; --i) {
        const breakIndex = prev.paragraphBreaks[i]!;
        if (breakIndex + 1 >= prev.selection.start) continue;

        const index = breakIndex + 1;

        return { ...prev, selection: { end: index, start: index } };
      }

      next.selection = { end: 0, start: 0 };
      break;
    }

    case "end-next-transcript-break": {
      // Jump to the smallest transcript break strictly after the current
      // selection end, falling back to the last word.
      let i = prev.words.length - 1;
      for (const breakIndex of prev.paragraphBreaks) {
        if (breakIndex > prev.selection.end) {
          i = breakIndex;
          break;
        }
      }

      next.selection = { end: i, start: i };
      break;
    }

    case "set-caption-breaks":
      next.captionBreaks = action.captionBreaks;
      break;

    case "set-transcript-breaks":
      next.paragraphBreaks = action.transcriptBreaks;
      break;

    case "insert-word":
      next.words = [
        ...prev.words.slice(0, action.index),
        [action.value, action.startTime, action.endTime],
        ...prev.words.slice(action.index),
      ];
      break;

    case "selection-backward": {
      const newStart = Math.max(0, prev.selection.start - 1);
      next.selection = {
        end: newStart,
        start: newStart,
      };
      break;
    }

    case "selection-forward": {
      const newEnd = Math.min(prev.words.length - 1, prev.selection.end + 1);
      next.selection = {
        end: newEnd,
        start: newEnd,
      };
      break;
    }

    case "selection-set":
      next.selection = action.selection;
      break;
  }

  // Record mutating actions for undo/redo. Toggles are normalized to the
  // concrete `set-*-breaks` result they produced, so that undo/redo does not
  // depend on the selection at the time they are replayed.
  if (append) {
    const recorded = record(action, prev, next);
    if (recorded) {
      next.undoStack = [...prev.undoStack, recorded];
      next.redoStack = [];
    }
  }

  return next;
}

/**
 * Returns the action to record on the undo stack for a just-applied action, or
 * `undefined` if the action is not recorded (pure selection/navigation moves).
 * Toggles are recorded as the resulting `set-*-breaks` array so replaying them
 * is deterministic regardless of the current selection.
 */
function record(action: Action, prev: State, next: State): Action | undefined {
  switch (action.action) {
    case "change-word":
    case "delete-word":
    case "insert-word":
      return action;

    // Set actions capture the previous array so undo can restore it regardless
    // of the state at replay time.
    case "set-caption-breaks":
    case "toggle-caption-break":
      return {
        action: "set-caption-breaks",
        captionBreaks: next.captionBreaks,
        prevCaptionBreaks: prev.captionBreaks,
      };

    case "set-transcript-breaks":
    case "toggle-transcript-break":
      return {
        action: "set-transcript-breaks",
        prevTranscriptBreaks: prev.paragraphBreaks,
        transcriptBreaks: next.paragraphBreaks,
      };

    default:
      return undefined;
  }
}

/**
 * Inverts an action, returning the action that would undo it.
 */
export function invert(prev: State, action: Action): Action {
  switch (action.action) {
    case "delete-word":
      return {
        action: "insert-word",
        endTime: prev.words[action.index]![2],
        index: action.index,
        startTime: prev.words[action.index]![1],
        value: prev.words[action.index]![0],
      };

    // Toggles are normalized to `set-*-breaks` before being recorded, so they
    // never reach undo/redo directly; they invert to themselves for
    // completeness alongside the pure navigation moves.
    case "end-next-caption":
    case "end-next-sentence":
    case "end-next-transcript-break":
    case "identity":
    case "start-prev-caption":
    case "start-prev-sentence":
    case "start-prev-transcript-break":
    case "toggle-caption-break":
    case "toggle-transcript-break":
      return action;

    case "insert-word":
      return {
        action: "delete-word",
        index: action.index,
      };

    // Restore the array captured when the action was recorded. Swapping the
    // arrays makes the inverse itself invertible, so redo works too.
    case "set-caption-breaks":
      return {
        action: "set-caption-breaks",
        captionBreaks: action.prevCaptionBreaks ?? prev.captionBreaks,
        prevCaptionBreaks: action.captionBreaks,
      };

    case "set-transcript-breaks":
      return {
        action: "set-transcript-breaks",
        prevTranscriptBreaks: action.transcriptBreaks,
        transcriptBreaks: action.prevTranscriptBreaks ?? prev.paragraphBreaks,
      };

    case "selection-backward":
    case "selection-forward":
    case "selection-set":
      return {
        action: "selection-set",
        selection: prev.selection,
      };

    case "change-word":
      return {
        action: "change-word",
        index: action.index,
        value: prev.words[action.index]![0],
      };
  }
}

/**
 * Undoes the most recently applied action, if any.
 */
export function undo(prev: State): State {
  const action = prev.undoStack.at(-1);
  if (!action) return prev;

  // Apply the inverse against the current state without recording it, then
  // move the original action onto the redo stack.
  const next = apply(prev, invert(prev, action), false);

  return {
    ...next,
    redoStack: [...prev.redoStack, action],
    undoStack: prev.undoStack.slice(0, -1),
  };
}

/**
 * Redoes the most recently undone action, if any.
 */
export function redo(prev: State): State {
  const action = prev.redoStack.at(-1);
  if (!action) return prev;

  // Reapply the action against the current state without recording it, then
  // move it back onto the undo stack.
  const next = apply(prev, action, false);

  return {
    ...next,
    redoStack: prev.redoStack.slice(0, -1),
    undoStack: [...prev.undoStack, action],
  };
}
