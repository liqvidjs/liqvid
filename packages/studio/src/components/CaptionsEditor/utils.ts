import type { Action, State } from "./state.ts";

/**
 * Applies an action to a state and returns the new state.
 */
export function apply(prev: State, action: Action, append = true): State {
  if (action.action === "identity") return prev;

  const next = { ...prev };
  // Only mutating actions are recorded for undo/redo; pure selection and
  // navigation moves do not affect the stacks.
  if (append && isMutating(action)) {
    next.undoStack = [...prev.undoStack, action];
    next.redoStack = [];
  }

  switch (action.action) {
    case "change-word":
      next.transcript = prev.transcript.map((entry, i) =>
        i === action.index ? [action.value, entry[1], entry[2]] : entry,
      );
      break;

    case "delete-word":
      next.transcript = prev.transcript.filter((_, i) => i !== action.index);
      break;

    case "start-prev-sentence": {
      let i = prev.selection.start - 2;
      for (; i >= 0; --i) {
        if (prev.transcript[i]![0].endsWith(".")) {
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
      for (; i < prev.transcript.length; ++i) {
        if (prev.transcript[i]![0].endsWith(".")) break;
      }

      i = Math.min(i, prev.transcript.length - 1);

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
      let i = prev.transcript.length - 1;
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

      next.transcriptBreaks = prev.transcriptBreaks.includes(index)
        ? prev.transcriptBreaks.filter((breakIndex) => breakIndex !== index)
        : [...prev.transcriptBreaks, index].sort((a, b) => a - b);
      break;
    }

    case "start-prev-transcript-break": {
      // Jump to the word after the largest transcript break strictly before
      // the current selection start, falling back to 0.
      for (let i = prev.transcriptBreaks.length - 1; i >= 0; --i) {
        const breakIndex = prev.transcriptBreaks[i]!;
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
      let i = prev.transcript.length - 1;
      for (const breakIndex of prev.transcriptBreaks) {
        if (breakIndex > prev.selection.end) {
          i = breakIndex;
          break;
        }
      }

      next.selection = { end: i, start: i };
      break;
    }

    case "insert-word":
      next.transcript = [
        ...prev.transcript.slice(0, action.index),
        [action.value, action.startTime, action.endTime],
        ...prev.transcript.slice(action.index),
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
      const newEnd = Math.min(
        prev.transcript.length - 1,
        prev.selection.end + 1,
      );
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

  return next;
}

/**
 * Returns whether an action mutates the transcript or caption breaks (and is
 * thus recorded for undo/redo), as opposed to a pure selection/navigation move.
 */
function isMutating(action: Action): boolean {
  switch (action.action) {
    case "change-word":
    case "delete-word":
    case "insert-word":
    case "toggle-caption-break":
    case "toggle-transcript-break":
      return true;
    default:
      return false;
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
        endTime: prev.transcript[action.index]![2],
        index: action.index,
        startTime: prev.transcript[action.index]![1],
        value: prev.transcript[action.index]![0],
      };

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
        value: prev.transcript[action.index]![0],
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
