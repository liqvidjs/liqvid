import type { Action, State } from "./state.ts";

/**
 * Applies an action to a state and returns the new state.
 */
export function apply(prev: State, action: Action): State {
  switch (action.action) {
    case "change-word":
      return {
        ...prev,
        stack: [...prev.stack, action],
        transcript: prev.transcript.map((entry, i) =>
          i === action.index ? [action.value, entry[1], entry[2]] : entry,
        ),
      };

    case "delete-word":
      return {
        ...prev,
        stack: [...prev.stack, action],
        transcript: prev.transcript.filter((_, i) => i !== action.index),
      };

    case "start-prev-sentence": {
      let i = prev.selection.start - 2;
      for (; i >= 0; --i) {
        if (prev.transcript[i]![0].endsWith(".")) {
          i++;
          break;
        }
      }

      i = Math.max(i, 0);

      return { ...prev, selection: { end: i, start: i } };
    }

    case "end-next-sentence": {
      let i = prev.selection.end + 1;
      for (; i < prev.transcript.length; ++i) {
        if (prev.transcript[i]![0].endsWith(".")) break;
      }

      i = Math.min(i, prev.transcript.length - 1);

      return { ...prev, selection: { end: i, start: i } };
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

      return { ...prev, selection: { end: 0, start: 0 } };
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

      return { ...prev, selection: { end: i, start: i } };
    }

    case "identity":
      return prev;

    case "insert-word":
      return {
        ...prev,
        stack: [...prev.stack, action],
        transcript: [
          ...prev.transcript.slice(0, action.index),
          [action.value, action.startTime, action.endTime],
          ...prev.transcript.slice(action.index),
        ],
      };

    case "selection-backward": {
      const newStart = Math.max(0, prev.selection.start - 1);
      return {
        ...prev,
        selection: {
          end: newStart,
          start: newStart,
        },
      };
    }

    case "selection-forward": {
      const newEnd = Math.min(
        prev.transcript.length - 1,
        prev.selection.end + 1,
      );
      return {
        ...prev,
        selection: {
          end: newEnd,
          start: newEnd,
        },
      };
    }

    case "selection-set":
      return {
        ...prev,
        selection: action.selection,
        stack: [...prev.stack, action],
      };
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

    case "identity":
      return action;

    case "insert-word":
      return {
        action: "delete-word",
        index: action.index,
      };

    case "end-next-caption":
    case "start-prev-caption":
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
