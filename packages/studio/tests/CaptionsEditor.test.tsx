import { describe, expect, test } from "@jest/globals";

import type { State } from "../src/components/CaptionsEditor/state.ts";
import { apply, redo, undo } from "../src/components/CaptionsEditor/utils.ts";

/** Build a minimal state from explicit word text and an initial selection. */
function stateFromWords(
  wordTexts: string[],
  selection: State["selection"] = { end: 0, start: 0 },
): State {
  return {
    captionBreaks: [],
    paragraphBreaks: [],
    redoStack: [],
    selection,
    undoStack: [],
    words: wordTexts.map(
      (text, i) => [text, i * 1000, i * 1000 + 500] as const,
    ),
  };
}

/** Build a minimal state with `count` dummy words and the given breaks. */
function makeState(
  count: number,
  {
    captionBreaks = [],
    paragraphBreaks = [],
    selection = { end: 0, start: 0 },
  }: Partial<
    Pick<State, "captionBreaks" | "paragraphBreaks" | "selection">
  > = {},
): State {
  return {
    captionBreaks,
    paragraphBreaks,
    redoStack: [],
    selection,
    undoStack: [],
    words: Array.from(
      { length: count },
      (_, i) => [`w${i}`, i * 1000, i * 1000 + 500] as const,
    ),
  };
}

describe("delete-word break shifting", () => {
  test("removes a caption break on the deleted word", () => {
    const state = makeState(5, { captionBreaks: [1, 3] });
    const next = apply(state, { action: "delete-word", index: 1 });

    // The break on word 1 is deleted; the break on word 3 shifts to 2.
    expect(next.captionBreaks).toEqual([2]);
  });

  test("removes a paragraph break on the deleted word", () => {
    const state = makeState(5, { paragraphBreaks: [1, 3] });
    const next = apply(state, { action: "delete-word", index: 1 });

    expect(next.paragraphBreaks).toEqual([2]);
  });

  test("shifts breaks after the deleted word down by one", () => {
    const state = makeState(6, {
      captionBreaks: [2, 4],
      paragraphBreaks: [3, 5],
    });
    const next = apply(state, { action: "delete-word", index: 0 });

    // Every break is after the deletion, so all shift down by one.
    expect(next.captionBreaks).toEqual([1, 3]);
    expect(next.paragraphBreaks).toEqual([2, 4]);
  });

  test("leaves breaks before the deleted word unchanged", () => {
    const state = makeState(6, {
      captionBreaks: [0, 1],
      paragraphBreaks: [1, 2],
    });
    const next = apply(state, { action: "delete-word", index: 4 });

    expect(next.captionBreaks).toEqual([0, 1]);
    expect(next.paragraphBreaks).toEqual([1, 2]);
  });

  test("handles breaks before, on, and after the deleted word together", () => {
    const state = makeState(7, {
      captionBreaks: [1, 3, 5],
      paragraphBreaks: [0, 3, 6],
    });
    const next = apply(state, { action: "delete-word", index: 3 });

    // Before (1) unchanged, on (3) removed, after (5) → 4.
    expect(next.captionBreaks).toEqual([1, 4]);
    // Before (0) unchanged, on (3) removed, after (6) → 5.
    expect(next.paragraphBreaks).toEqual([0, 5]);
  });

  test("does not mutate the previous state's break arrays", () => {
    const captionBreaks = [1, 3];
    const paragraphBreaks = [1, 3];
    const state = makeState(5, { captionBreaks, paragraphBreaks });

    apply(state, { action: "delete-word", index: 1 });

    expect(captionBreaks).toEqual([1, 3]);
    expect(paragraphBreaks).toEqual([1, 3]);
  });
});

describe("undo after delete-word restores breaks", () => {
  test("restores breaks after the deleted word", () => {
    const state = makeState(6, {
      captionBreaks: [2, 4],
      paragraphBreaks: [3, 5],
    });

    const deleted = apply(state, { action: "delete-word", index: 0 });
    const restored = undo(deleted);

    expect(restored.captionBreaks).toEqual([2, 4]);
    expect(restored.paragraphBreaks).toEqual([3, 5]);
  });

  test("restores a break that was on the deleted word", () => {
    const state = makeState(5, {
      captionBreaks: [1, 3],
      paragraphBreaks: [1, 3],
    });

    // Deleting word 1 removes the break on word 1 and shifts the break on
    // word 3 to 2. Undo must bring both breaks back to [1, 3].
    const deleted = apply(state, { action: "delete-word", index: 1 });
    const restored = undo(deleted);

    expect(restored.captionBreaks).toEqual([1, 3]);
    expect(restored.paragraphBreaks).toEqual([1, 3]);
  });

  test("restores the exact word list", () => {
    const state = makeState(5, { captionBreaks: [1, 3] });

    const deleted = apply(state, { action: "delete-word", index: 1 });
    const restored = undo(deleted);

    expect(restored.words).toEqual(state.words);
  });

  test("redo after undo re-applies the shifted breaks", () => {
    const state = makeState(5, {
      captionBreaks: [1, 3],
      paragraphBreaks: [1, 3],
    });

    const deleted = apply(state, { action: "delete-word", index: 1 });
    const redone = redo(undo(deleted));

    // Redo should reproduce the post-delete state: break on 1 dropped, 3 → 2.
    expect(redone.captionBreaks).toEqual([2]);
    expect(redone.paragraphBreaks).toEqual([2]);
    expect(redone.words).toEqual(deleted.words);
  });
});

describe("end-next-comma", () => {
  test("moves the selection to the next word ending in a comma", () => {
    const state = stateFromWords(["one", "two,", "three", "four,", "five"]);
    const next = apply(state, { action: "end-next-comma" });

    expect(next.selection).toEqual({ end: 1, start: 1 });
  });

  test("skips the current word and finds the following comma", () => {
    const state = stateFromWords(["one,", "two", "three,", "four"], {
      end: 0,
      start: 0,
    });
    const next = apply(state, { action: "end-next-comma" });

    // Starting on the comma at index 0, it should move to the next comma (2).
    expect(next.selection).toEqual({ end: 2, start: 2 });
  });

  test("stops at the last word when no further comma exists", () => {
    const state = stateFromWords(["one", "two", "three"]);
    const next = apply(state, { action: "end-next-comma" });

    expect(next.selection).toEqual({ end: 2, start: 2 });
  });
});

describe("change-word", () => {
  test("changes the word at the given index", () => {
    const state = stateFromWords(["one", "two", "three"]);
    const next = apply(state, {
      action: "change-word",
      index: 1,
      value: "TWO",
    });

    expect(next.words.map((w) => w[0])).toEqual(["one", "TWO", "three"]);
  });

  test("undo restores the previous word", () => {
    const state = stateFromWords(["one", "two", "three"]);

    const changed = apply(state, {
      action: "change-word",
      index: 1,
      value: "TWO",
    });
    const restored = undo(changed);

    expect(restored.words.map((w) => w[0])).toEqual(["one", "two", "three"]);
  });

  test("redo re-applies the change", () => {
    const state = stateFromWords(["one", "two", "three"]);

    const changed = apply(state, {
      action: "change-word",
      index: 1,
      value: "TWO",
    });
    const redone = redo(undo(changed));

    expect(redone.words.map((w) => w[0])).toEqual(["one", "TWO", "three"]);
  });

  test("preserves the word's start and end times", () => {
    const state = stateFromWords(["one", "two", "three"]);
    const [, start, end] = state.words[1]!;

    const changed = apply(state, {
      action: "change-word",
      index: 1,
      value: "TWO",
    });

    expect(changed.words[1]).toEqual(["TWO", start, end]);
  });
});

describe("merge-word", () => {
  test("merges the following word into the current word", () => {
    const state = stateFromWords(["one", "two", "three"]);
    const next = apply(state, { action: "merge-word", index: 0 });

    expect(next.words.map((w) => w[0])).toEqual(["one two", "three"]);
  });

  test("uses the start of the first word and end of the second", () => {
    const state = stateFromWords(["one", "two", "three"]);
    const [, firstStart] = state.words[0]!;
    const [, , secondEnd] = state.words[1]!;

    const next = apply(state, { action: "merge-word", index: 0 });

    expect(next.words[0]).toEqual(["one two", firstStart, secondEnd]);
  });

  test("shifts breaks after the absorbed word down by one", () => {
    const state = makeState(5, {
      captionBreaks: [2, 3],
      paragraphBreaks: [1, 4],
    });
    const next = apply(state, { action: "merge-word", index: 0 });

    // Word 1 is absorbed into word 0, so indices after 1 shift down by one.
    expect(next.captionBreaks).toEqual([1, 2]);
    expect(next.paragraphBreaks).toEqual([3]);
  });

  test("undo restores both words and breaks", () => {
    const state = makeState(4, {
      captionBreaks: [1, 2],
      paragraphBreaks: [1],
    });

    const merged = apply(state, { action: "merge-word", index: 0 });
    const restored = undo(merged);

    expect(restored.words).toEqual(state.words);
    expect(restored.captionBreaks).toEqual([1, 2]);
    expect(restored.paragraphBreaks).toEqual([1]);
  });

  test("redo re-applies the merge", () => {
    const state = stateFromWords(["one", "two", "three"]);

    const merged = apply(state, { action: "merge-word", index: 0 });
    const redone = redo(undo(merged));

    expect(redone.words.map((w) => w[0])).toEqual(["one two", "three"]);
  });

  test("is a no-op when there is no following word", () => {
    const state = stateFromWords(["one", "two"], { end: 1, start: 1 });
    const next = apply(state, { action: "merge-word", index: 1 });

    expect(next.words.map((w) => w[0])).toEqual(["one", "two"]);
  });
});
