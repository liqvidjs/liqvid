import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback } from "@liqvid/playback/react";
import { useRef, useState } from "react";

import {
  cycleCapitalization,
  defaultShortcuts,
  hasModKey,
  isEditableTarget,
  type Shortcuts,
} from "#_/components/CaptionsEditor/shortcuts.ts.js";

import { caretPositionFromPoint } from "./CaptionsEditor.tsx";
import type { Store } from "./store.ts";
import type { Highlight } from "./types.ts";
import {
  activeWordIndex,
  apply,
  redo,
  undo,
  wordIndexAtCaret,
  wordRectRelativeToStripes,
} from "./utils.ts";

/** State of an in-progress word edit. */
export type WordEdit = { index: number; value: string; rect: Highlight };

/**
 * Tracks the word under the pointer and reports the rectangle to draw a hover
 * highlight over it. The highlight is positioned relative to the `.stripes`
 * content box (returned via `stripesRef`), so it scrolls naturally with the
 * transcript.
 *
 * The word under the pointer is found the same way clicks are resolved: a caret
 * is placed at the pointer (`caretPositionFromPoint`) and mapped back to a word
 * index via {@link wordIndexAtCaret}. The word's box is then measured with a
 * DOM {@link Range} (see {@link wordRect}).
 */
export function useHoverHighlight(
  store: Store,
  stripesRef: React.RefObject<HTMLDivElement | null>,
) {
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  // Remember the word currently highlighted so a `mousemove` that stays within
  // the same word does no work and triggers no re-render.
  const hoveredWord = useRef(-1);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = stripesRef.current;
    if (!container) return;

    const { words } = store.getState();

    const caret =
      words.length === 0 ? null : caretPositionFromPoint(e.clientX, e.clientY);
    const index =
      caret && container.contains(caret.node)
        ? wordIndexAtCaret(container, words, caret)
        : -1;

    if (index === hoveredWord.current) return;
    hoveredWord.current = index;

    if (index < 0) {
      setHighlight(null);
      return;
    }

    const rect = wordRectRelativeToStripes(container, words, index);
    setHighlight(rect);
  };

  const onMouseLeave = () => {
    hoveredWord.current = -1;
    setHighlight(null);
  };

  return { highlight, onMouseLeave, onMouseMove };
} /**
 * Manages inline editing of a word via an absolutely-positioned `<input>`.
 *
 * The input is not mounted inside the transcript markup (which would complicate
 * the DOM the click/hover word-mapping relies on); instead the caller renders
 * it as an overlay in the `.stripes` box, positioned over the word via
 * {@link wordRectRelativeToStripes}. `begin` seeds the input with the word's
 * text; `commit` dispatches a `change-word`; `cancel` aborts.
 */
export function useWordEditor(
  store: Store,
  stripesRef: React.RefObject<HTMLDivElement | null>,
) {
  const [editing, setEditing] = useState<WordEdit | null>(null);

  const begin = (index: number) => {
    const container = stripesRef.current;
    if (!container) return;

    const { words } = store.getState();
    const word = words[index]?.[0];
    if (word === undefined) return;

    const rect = wordRectRelativeToStripes(container, words, index);
    if (!rect) return;

    setEditing({ index, rect, value: word });
  };

  const commit = () => {
    // Close the editor, then apply the change. The store update must happen
    // outside the `setEditing` updater — updaters must be pure, and mutating the
    // store there triggers a re-render mid-render ("Cannot update a component
    // while rendering a different component").
    if (editing) {
      const { index, value } = editing;
      store.setState((state) => {
        const current = state.words[index]?.[0];
        if (current === undefined || current === value) return state;

        return apply(state, { action: "change-word", index, value });
      });
    }

    setEditing(null);
  };

  const cancel = () => setEditing(null);

  const setValue = (value: string) =>
    setEditing((edit) => (edit ? { ...edit, value } : edit));

  return { begin, cancel, commit, editing, setValue };
} /**
 * Select a word when it is clicked.
 *
 * Determining the word index from the click is awkward because the transcript
 * is not a flat list of word elements: words are joined into shared text nodes
 * and interspersed with `<mark>` (active word / current selection), `<br>`
 * (transcript breaks) and empty caption-break `<span>`s.
 *
 * We locate the caret at the click point (via the DOM Selection / caret APIs)
 * and resolve it to a word index by walking the real DOM text with a
 * {@link TreeWalker} — see {@link wordIndexAtCaret}. Word boundaries are not
 * derivable from whitespace (word text is user-editable and may contain
 * spaces), so the words array is aligned against the actual rendered text
 * rather than a reconstruction of it.
 */
export function useSelectOnClick(store: Store) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget.querySelector<HTMLElement>(
      '[data-role="stripes"]',
    );
    if (!container) return;

    const { words } = store.getState();
    if (words.length === 0) return;

    const caret = caretPositionFromPoint(e.clientX, e.clientY);
    if (!caret || !container.contains(caret.node)) return;

    const index = wordIndexAtCaret(container, words, caret);
    if (index < 0) return;

    const clamped = Math.min(Math.max(index, 0), words.length - 1);

    store.setState((state) =>
      apply(state, {
        action: "selection-set",
        selection: { end: clamped, start: clamped },
      }),
    );
  };
}
/** @package Wire up shortcuts for the captions editor */

export function useCaptionsEditorShortcuts(
  store: Store,
  shortcuts: Partial<Shortcuts>,
  {
    editWord,
    save,
  }: {
    editWord: () => void;
    save: () => Promise<void>;
  },
) {
  const keys = { ...defaultShortcuts, ...shortcuts };
  const playback = usePlayback();

  useEventListener(globalThis?.window, "keydown", (e) => {
    // Ignore shortcuts while typing in an input/textarea/contenteditable (e.g.
    // the inline word editor), which handles its own keys.
    if (isEditableTarget(e.target)) return;

    switch (e.key) {
      case keys.selectionBackward:
        store.setState((state) =>
          apply(state, { action: "selection-backward" }),
        );
        break;
      case keys.selectionForward:
        store.setState((state) =>
          apply(state, { action: "selection-forward" }),
        );
        break;
      case keys.startPrevSentence:
        store.setState((state) =>
          apply(state, { action: "start-prev-sentence" }),
        );
        break;
      case keys.endNextSentence:
        store.setState((state) =>
          apply(state, { action: "end-next-sentence" }),
        );
        break;
      case keys.endNextComma:
        store.setState((state) => apply(state, { action: "end-next-comma" }));
        break;
      case keys.startPrevCaption:
        store.setState((state) =>
          apply(state, { action: "start-prev-caption" }),
        );
        break;
      case keys.endNextCaption:
        store.setState((state) => apply(state, { action: "end-next-caption" }));
        break;
      case keys.toggleCaptionBreak:
        store.setState((state) =>
          apply(state, { action: "toggle-caption-break" }),
        );
        break;
      case keys.startPrevTranscriptBreak:
        store.setState((state) =>
          apply(state, { action: "start-prev-transcript-break" }),
        );
        break;
      case keys.endNextTranscriptBreak:
        store.setState((state) =>
          apply(state, { action: "end-next-transcript-break" }),
        );
        break;
      case keys.toggleTranscriptBreak:
        store.setState((state) =>
          apply(state, { action: "toggle-transcript-break" }),
        );
        break;
      case keys.seekToSelection: {
        const { selection, words: transcript } = store.getState();
        const word = transcript[selection.start];
        if (word) {
          playback.currentTime$ = { milliseconds: word[1] };
        }
        break;
      }
      case keys.selectCurrentWord:
        store.setState((state) => {
          const t = playback.currentTime$.inMilliseconds();
          const index = activeWordIndex(state.words, t);
          if (index < 0) return state;

          return apply(state, {
            action: "selection-set",
            selection: { end: index, start: index },
          });
        });
        break;
      case keys.deleteWord:
        store.setState((state) => {
          if (state.words.length === 0) return state;
          return apply(state, {
            action: "delete-word",
            index: state.selection.start,
          });
        });
        break;
      case keys.mergeFollowing:
        store.setState((state) => {
          const index = state.selection.start;
          // Nothing to merge if there is no following word.
          if (index >= state.words.length - 1) return state;
          return apply(state, { action: "merge-word", index });
        });
        break;
      case keys.cycleCapitalization:
        store.setState((state) => {
          const index = state.selection.start;
          const word = state.words[index]?.[0];
          if (word === undefined) return state;

          const value = cycleCapitalization(word);
          if (value === word) return state;

          return apply(state, { action: "change-word", index, value });
        });
        break;
      case keys.editWord:
        // Prevent the key from being typed into the input we're about to open.
        e.preventDefault();
        editWord();
        break;
      case "s": {
        if (!hasModKey(e)) return;
        e.preventDefault();
        save();
        break;
      }

      case "z":
        if (!hasModKey(e)) return;
        e.preventDefault();

        // Shift+Cmd/Ctrl+Z redoes, matching common editor conventions.
        store.setState((state) => (e.shiftKey ? redo(state) : undo(state)));
        break;
      case "y":
        if (!hasModKey(e)) return;
        e.preventDefault();

        store.setState((state) => redo(state));
        break;
    }
  });
}
