import { describe, expect, test } from "@jest/globals";

import type { State } from "./state.ts";
import {
  apply,
  matchFillerWords,
  parseFillerWords,
  redo,
  undo,
} from "./utils.ts";

const entry = (text: string, index: number) =>
  [text, index * 10, index * 10 + 10] as const;

const baseState = (
  words: readonly string[],
  captionBreaks: readonly number[] = [],
  paragraphBreaks: readonly number[] = [],
) =>
  ({
    captionBreaks,
    open: false,
    paragraphBreaks,
    redoStack: [],
    selection: { end: 0, start: 0 },
    undoStack: [],
    words: words.map(entry),
  }) as State;

describe("parseFillerWords", () => {
  test("splits on commas and discards blanks", () => {
    expect(parseFillerWords("uh, um,,er ,")).toEqual(["uh", "um", "er"]);
    expect(parseFillerWords("")).toEqual([]);
  });
});

describe("matchFillerWords", () => {
  const script = ["So", "Um", "uh.", "um,", `"um"`, "unique", "Umhum"];
  const transcript = script.map(entry) as unknown as State["words"];

  test("matches capitalization and punctuation variants by default", () => {
    expect(
      matchFillerWords(transcript, {
        fillerWords: "uh, um",
        ignoreCapitalization: true,
        ignorePunctuation: true,
      }),
    ).toEqual([1, 2, 3, 4]);
  });

  test("respects ignoreCapitalization", () => {
    expect(
      matchFillerWords(transcript, {
        fillerWords: "um",
        ignoreCapitalization: false,
        ignorePunctuation: true,
      }),
    ).toEqual([3, 4]);
  });

  test("respects ignorePunctuation", () => {
    expect(
      matchFillerWords(transcript, {
        fillerWords: "um",
        ignoreCapitalization: true,
        ignorePunctuation: false,
      }),
    ).toEqual([1]);
  });
});

describe("delete-words", () => {
  const words = ["uh", "hello", "um,", "world"];

  test("deletes the given indices and shifts breaks", () => {
    const next = apply(baseState(words, [0, 1, 2, 3], [2]) as State, {
      action: "delete-words",
      indices: [0, 2],
    });

    expect(next.words.map((w) => w[0])).toEqual(["hello", "world"]);
    expect(next.captionBreaks).toEqual([0, 1]);
    expect(next.paragraphBreaks).toEqual([]);
    expect(next.selection).toEqual({ end: 0, start: 0 });
  });

  test("undo restores words and breaks verbatim", () => {
    const state = baseState(words, [0, 1, 2, 3], [2]) as State;
    const restored = undo(
      apply(state, { action: "delete-words", indices: [0, 2] }),
    );

    expect(restored.words).toEqual(state.words);
    expect(restored.captionBreaks).toEqual(state.captionBreaks);
    expect(restored.paragraphBreaks).toEqual(state.paragraphBreaks);
  });

  test("redo re-applies after undo", () => {
    const state = baseState(words, [0, 1, 2, 3], [2]) as State;
    const first = apply(state, { action: "delete-words", indices: [0, 2] });
    const redone = redo(undo(first));

    expect(redone.words).toEqual(first.words);
    expect(redone.captionBreaks).toEqual(first.captionBreaks);
    expect(redone.paragraphBreaks).toEqual(first.paragraphBreaks);
  });

  test("breaks on deleted words are dropped and undo restores them", () => {
    const state = baseState(words, [0, 3]) as State;
    const next = apply(state, { action: "delete-words", indices: [0, 3] });

    expect(next.captionBreaks).toEqual([]);
    expect(undo(next).captionBreaks).toEqual([0, 3]);
  });
});
