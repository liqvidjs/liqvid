import type { TranscriptEntry } from "@liqvid/schemas";

import type { Action, State, Transcript } from "./state.ts";
import type { Highlight } from "./types.ts";

/**
 * Returns the index of the word active at time `t` (in ms), or -1 if none.
 */
export function activeWordIndex(transcript: Transcript, t: number): number {
  let lo = 0;
  let hi = transcript.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [, start, end] = transcript[mid]!;

    if (t < start) hi = mid - 1;
    else if (t >= end) lo = mid + 1;
    else return mid;
  }

  return -1;
}

/**
 * Adjusts break indices when the word at `deletedIndex` is removed: a break on
 * the deleted word is dropped, a break after it is shifted down by one, and a
 * break before it is left in place.
 */
function shiftBreaksAfterDelete(
  breaks: readonly number[],
  deletedIndex: number,
): number[] {
  const result: number[] = [];

  for (const index of breaks) {
    if (index === deletedIndex) continue;
    result.push(index > deletedIndex ? index - 1 : index);
  }

  return result;
}

/**
 * Adjusts break indices when a word is inserted at `insertedIndex`: a break at
 * or after the insertion point is shifted up by one; earlier breaks are left in
 * place.
 */
function shiftBreaksAfterInsert(
  breaks: readonly number[],
  insertedIndex: number,
): number[] {
  return breaks.map((index) => (index >= insertedIndex ? index + 1 : index));
}

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

      // Deleting a word shifts every subsequent word index down by one, so
      // breaks must move with them: a break *on* the deleted word is removed,
      // and a break *after* it is shifted down by one so it stays on the same
      // word. Breaks before the deleted word are unaffected.
      next.captionBreaks = shiftBreaksAfterDelete(
        prev.captionBreaks,
        action.index,
      );
      next.paragraphBreaks = shiftBreaksAfterDelete(
        prev.paragraphBreaks,
        action.index,
      );

      // Collapse the selection onto the word that now occupies the deleted
      // slot (the following word), or the previous word when the last word was
      // deleted. Clamp to a valid index for the shortened transcript.
      const index = Math.max(0, Math.min(action.index, next.words.length - 1));
      next.selection = { end: index, start: index };
      break;
    }

    case "merge-word": {
      const first = prev.words[action.index];
      const second = prev.words[action.index + 1];

      // Nothing to merge if there is no following word.
      if (!first || !second) break;

      // Combine texts with a space, keeping the first word's start and the
      // second word's end.
      const merged: TranscriptEntry = [
        `${first[0]} ${second[0]}`,
        first[1],
        second[2],
      ];

      next.words = [
        ...prev.words.slice(0, action.index),
        merged,
        ...prev.words.slice(action.index + 2),
      ];

      // The following word (index + 1) is absorbed, so breaks shift exactly as
      // for deleting that word.
      next.captionBreaks = shiftBreaksAfterDelete(
        prev.captionBreaks,
        action.index + 1,
      );
      next.paragraphBreaks = shiftBreaksAfterDelete(
        prev.paragraphBreaks,
        action.index + 1,
      );

      next.selection = { end: action.index, start: action.index };
      break;
    }

    case "start-prev-sentence": {
      let i = prev.selection.start - 2;
      for (; i >= 0; --i) {
        if (isSentenceEnd(prev.words[i]!)) {
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
        if (isSentenceEnd(prev.words[i]!)) break;
      }

      i = Math.min(i, prev.words.length - 1);

      next.selection = { end: i, start: i };
      break;
    }

    case "end-next-comma": {
      let i = prev.selection.end + 1;
      for (; i < prev.words.length; ++i) {
        if (prev.words[i]![0].endsWith(",")) break;
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

    case "insert-word": {
      const words = [
        ...prev.words.slice(0, action.index),
        [action.value, action.startTime, action.endTime] as TranscriptEntry,
        ...prev.words.slice(action.index),
      ];

      // When inverting a `merge-word`, also overwrite the preceding word with
      // its pre-merge entry, splitting the merged word back into two.
      if (action.restorePrev && action.index > 0) {
        words[action.index - 1] = action.restorePrev;
      }

      next.words = words;

      // Inserting a word shifts every subsequent word index up by one, so
      // breaks at or after the insertion point move with them. When the action
      // carries explicit break arrays (e.g. inverting a `delete-word`), restore
      // them verbatim, since plain shifting cannot recover a break that the
      // deletion removed.
      next.captionBreaks =
        action.captionBreaks ??
        shiftBreaksAfterInsert(prev.captionBreaks, action.index);
      next.paragraphBreaks =
        action.paragraphBreaks ??
        shiftBreaksAfterInsert(prev.paragraphBreaks, action.index);
      break;
    }

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
    case "insert-word":
      return action;

    // Capture the previous text so undo can restore it regardless of the state
    // at replay time (by undo, `prev` already holds the changed value).
    case "change-word":
      return { ...action, prevValue: prev.words[action.index]?.[0] };

    // Capture the removed entry and the pre-delete break arrays so undo can
    // reinsert the word and restore the breaks regardless of the state at
    // replay time (by undo, `prev` no longer holds the deleted word, and its
    // breaks have already been shifted).
    case "delete-word":
      return {
        ...action,
        deleted: prev.words[action.index],
        prevCaptionBreaks: prev.captionBreaks,
        prevParagraphBreaks: prev.paragraphBreaks,
      };

    // Capture the two merged entries and the pre-merge break arrays so undo can
    // split the word back and restore the breaks exactly.
    case "merge-word": {
      const first = prev.words[action.index];
      const second = prev.words[action.index + 1];
      if (!first || !second) return undefined;
      return {
        ...action,
        prevCaptionBreaks: prev.captionBreaks,
        prevEntries: [first, second],
        prevParagraphBreaks: prev.paragraphBreaks,
      };
    }

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
function invert(prev: State, action: Action): Action {
  switch (action.action) {
    case "delete-word": {
      // The recorded action carries the removed entry and the pre-delete break
      // arrays, since by undo `prev` (the post-delete state) no longer holds
      // them. Passing the breaks restores them verbatim (see `insert-word`).
      const deleted = action.deleted ?? prev.words[action.index]!;
      return {
        action: "insert-word",
        captionBreaks: action.prevCaptionBreaks ?? prev.captionBreaks,
        endTime: deleted[2],
        index: action.index,
        paragraphBreaks: action.prevParagraphBreaks ?? prev.paragraphBreaks,
        startTime: deleted[1],
        value: deleted[0],
      };
    }

    // Toggles are normalized to `set-*-breaks` before being recorded, so they
    // never reach undo/redo directly; they invert to themselves for
    // completeness alongside the pure navigation moves.
    case "end-next-caption":
    case "end-next-comma":
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

    case "merge-word": {
      // Re-insert the second word after the current one and restore the first
      // word's original text/timing, splitting the merge apart. Breaks are
      // restored verbatim (see `insert-word`).
      const [first, second] = action.prevEntries ?? [
        prev.words[action.index]!,
        prev.words[action.index]!,
      ];
      return {
        action: "insert-word",
        captionBreaks: action.prevCaptionBreaks ?? prev.captionBreaks,
        endTime: second[2],
        index: action.index + 1,
        paragraphBreaks: action.prevParagraphBreaks ?? prev.paragraphBreaks,
        restorePrev: first,
        startTime: second[1],
        value: second[0],
      };
    }

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
        value: action.prevValue ?? prev.words[action.index]![0],
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

export function isSentenceEnd(token: TranscriptEntry): boolean {
  if (token[0].length === 0) return false;
  const last = token[0].at(-1)!;
  return last === "." || last === "!" || last === "?";
}
export function join(words: readonly TranscriptEntry[]) {
  return words.reduce(
    (acc, curr, index) => acc + (index > 0 ? " " : "") + curr[0],
    "",
  );
}

/**
 * Returns the box of `wordIndex` in coordinates relative to the `.stripes`
 * content box (accounting for scroll offset, so the box stays pinned to the
 * word as the transcript scrolls), or `null` if it cannot be resolved.
 */
export function wordRectRelativeToStripes(
  container: HTMLElement,
  words: readonly TranscriptEntry[],
  wordIndex: number,
): Highlight | null {
  const rect = wordRect(container, words, wordIndex);
  if (!rect) return null;

  const base = container.getBoundingClientRect();
  return {
    height: rect.height,
    left: rect.left - base.left + container.scrollLeft,
    top: rect.top - base.top + container.scrollTop,
    width: rect.width,
  };
}

/**
 * Maps a caret position inside the `.stripes` container to a word index.
 *
 * Word boundaries are not encoded in the DOM (words are joined into shared text
 * nodes and may themselves contain spaces once the transcript is editable), so
 * we cannot recover them from whitespace. Instead we walk the DOM text in
 * document order with a {@link TreeWalker} and greedily consume the `words`
 * array against it: each word's characters are matched in sequence, and the
 * single-space separators inserted between words (by `join`) — plus the extra
 * spaces `{" "}` React emits around ranges, marks, and caption markers — are
 * skipped as inter-word gaps. Because we consume the real DOM text rather than
 * a reconstruction, differences in exact spacing between segments cannot throw
 * the mapping off.
 *
 * As we walk, we track the running character offset; once we pass the caret
 * node/offset, the word currently being consumed is the one that was clicked.
 * Returns -1 if the caret cannot be resolved to a word.
 */
export function wordIndexAtCaret(
  container: HTMLElement,
  words: readonly TranscriptEntry[],
  caret: { node: Node; offset: number },
): number {
  // Absolute text offset of the caret within the container.
  const caretOffset = caretTextOffset(container, caret);
  if (caretOffset < 0) return -1;

  const { spans } = wordSpans(container, words);

  // Find the word whose span contains the caret. A caret in the whitespace gap
  // before a word resolves to that following word, so we test against the start
  // of the *next* word.
  for (let w = 0; w < spans.length; w++) {
    const isLast = w === spans.length - 1;
    const nextStart = isLast ? Number.POSITIVE_INFINITY : spans[w + 1]!.start;
    if (caretOffset < nextStart) return w;
  }

  return words.length - 1;
}

/**
 * Aligns the `words` array against the container's flat DOM text, returning the
 * flat text plus the `[start, end)` character span of every word within it.
 *
 * Word boundaries are not encoded in the DOM (words share text nodes and may
 * contain spaces), so we greedily match each word: between words we skip the
 * inter-word separator whitespace (the single `join` space plus React's extra
 * `{" "}` around ranges/marks/caption markers), then match the word's exact
 * characters — including any internal spaces — anchored at that position. This
 * consumes the real DOM text, so spacing differences between segments cannot
 * throw the alignment off.
 */
function wordSpans(
  container: HTMLElement,
  words: readonly TranscriptEntry[],
): { flat: string; spans: { start: number; end: number }[] } {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );

  // Concatenate all text nodes into one flat string; `TreeWalker` visits them
  // in document order, matching offsets measured the same way.
  let flat = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    flat += node.nodeValue ?? "";
  }

  const spans: { start: number; end: number }[] = [];
  let cursor = 0;

  for (let w = 0; w < words.length; w++) {
    // Skip the inter-word separator whitespace.
    while (cursor < flat.length && isSpace(flat[cursor]!)) cursor++;

    const word = words[w]![0];
    const start = cursor;
    const end = start + word.length;

    spans.push({ end, start });
    cursor = end;
  }

  return { flat, spans };
}

/**
 * Returns the bounding rectangle of `wordIndex` within `container`, in viewport
 * coordinates, or `null` if it cannot be resolved. Uses a DOM {@link Range}
 * over the word's character span so wrapped words still report their union box.
 */
function wordRect(
  container: HTMLElement,
  words: readonly TranscriptEntry[],
  wordIndex: number,
): DOMRect | null {
  const { spans } = wordSpans(container, words);
  const span = spans[wordIndex];
  if (!span) return null;

  const start = offsetToDomPosition(container, span.start);
  const end = offsetToDomPosition(container, span.end);
  if (!start || !end) return null;

  const range = document.createRange();
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
  } catch {
    return null;
  }

  return range.getBoundingClientRect();
}

/**
 * Converts an absolute character offset within `container` back into a DOM
 * position (`{ node, offset }`) by walking text nodes in document order until
 * the offset falls inside one of them.
 */
function offsetToDomPosition(
  container: HTMLElement,
  offset: number,
): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );

  let seen = 0;
  let last: Node | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = (node.nodeValue ?? "").length;
    if (offset <= seen + len) return { node, offset: offset - seen };
    seen += len;
    last = node;
  }

  // Offset past the end: clamp to the end of the last text node.
  if (last) return { node: last, offset: (last.nodeValue ?? "").length };
  return null;
}

/**
 * Computes the absolute character offset of a caret within `container`, summing
 * the lengths of all text nodes that precede it in document order (via a
 * {@link TreeWalker}) plus the caret's own offset within its node.
 */
function caretTextOffset(
  container: HTMLElement,
  caret: { node: Node; offset: number },
): number {
  // Element-offset carets (between child nodes) are normalised to the text
  // offset at the start of the child they point at.
  if (caret.node.nodeType !== Node.TEXT_NODE) {
    const child = caret.node.childNodes[caret.offset] ?? null;
    const range = document.createRange();
    range.setStart(container, 0);
    if (child) range.setEndBefore(child);
    else range.selectNodeContents(container);
    return range.toString().length;
  }

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );

  let offset = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node === caret.node) return offset + caret.offset;
    offset += (node.nodeValue ?? "").length;
  }

  return -1;
}

/** Whether `char` is an ASCII/Unicode whitespace character. */
function isSpace(char: string): boolean {
  return /\s/.test(char);
}
