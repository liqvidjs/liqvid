"use client";

import { usePlayback, usePlaybackEvent, useTime } from "@liqvid/playback/react";
import type { RichTranscript, TranscriptEntry } from "@liqvid/schemas";
import { between, type CleanUpFn } from "@liqvid/utils";
import {
  DotsThreeIcon,
  FloppyDiskIcon,
  KeyboardIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { useStudioPrivateApi } from "../../LiqvidDevToolsProvider.tsx";
import type { Transcript } from "../../types/schemas.mts";
import type { Awaitable } from "../../types.mts";
import { Button } from "../../ui/Button.tsx";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTrigger,
} from "../../ui/Dialog.tsx";
import {
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from "../../ui/Menu.tsx";
import { TimeDuration } from "../../ui/Time.tsx";
import { useAsyncTranslations } from "../../utils/react.tsx";
import { useChannel } from "../WebSocketProvider.tsx";

import { ShortcutsDialog } from "./ShortcutsDialog.tsx";
import { saveCaptions } from "./server.ts";
import { type Shortcuts, useCaptionsEditorShortcuts } from "./shortcuts.ts";
import { makeStore, type Store } from "./store.ts";
import { activeWordIndex, apply, isSentenceEnd } from "./utils.ts";

import styles from "./CaptionsEditor.module.css";

import Translations from "./.translations/en.json";

export function CaptionsEditor({
  displayProps = {},
  shortcuts = {},
  transcript: propTranscript,
}: {
  className?: string;
  displayProps?: React.HTMLAttributes<HTMLDivElement>;
  shortcuts?: Partial<Shortcuts>;
  transcript: Awaitable<RichTranscript>;
}) {
  const [store] = useState(() => makeStore());
  const { projectPath } = useStudioPrivateApi();

  useChannel("jobs", {
    deleteJob: () => {},
  });

  const t = useAsyncTranslations(Translations, "src/components/CaptionsEditor");

  useEffect(() => {
    Promise.resolve(propTranscript).then(
      ({ captionBreaks, paragraphBreaks, words }) => {
        store.setState({
          captionBreaks,
          paragraphBreaks,
          words: words,
        });
      },
    );
  }, [propTranscript, store]);

  const stripesRef = useRef<HTMLDivElement>(null);

  const onClick = useSelectOnClick(store);
  const { highlight, onMouseLeave, onMouseMove } = useHoverHighlight(
    store,
    stripesRef,
  );
  const {
    begin: beginEdit,
    cancel: cancelEdit,
    commit: commitEdit,
    editing,
    setValue: setEditValue,
  } = useWordEditor(store, stripesRef);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    const { captionBreaks, paragraphBreaks, words } = store.getState();

    if (saving) return;

    setSaving(true);
    try {
      await saveCaptions({
        projectPath,
        transcript: {
          captionBreaks,
          paragraphBreaks,
          words: words,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  useCaptionsEditorShortcuts(store, shortcuts, {
    editWord: () => beginEdit(store.getState().selection.start),
    save,
  });

  const {
    captionBreaks,
    selection,
    words: transcript,
    paragraphBreaks: transcriptBreaks,
  } = useStore(store);

  const [activeWord, setActiveWord] = useState(-1);

  useTime(
    (t) => activeWordIndex(transcript, t * 1000),
    (index) => setActiveWord(index),
  );

  // Scroll the current selection into view whenever it changes.
  const selectionRef = useRef<HTMLElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the selection changes to scroll the new mark into view
  useEffect(() => {
    selectionRef.current?.scrollIntoView({ block: "nearest" });
  }, [selection.start, selection.end]);

  /**
   * Renders the words `[from, to)`, wrapping the active word (if it falls in
   * this range) in a single `<mark>`. Keeps tag usage minimal: at most one
   * extra element and text node split per range.
   */
  const renderWords = (from: number, to: number) => {
    const text = join(transcript.slice(from, to));

    if (activeWord < from || activeWord >= to) return text;

    const before = join(transcript.slice(from, activeWord));
    const word = transcript[activeWord]![0];
    const after = join(transcript.slice(activeWord + 1, to));

    return (
      <>
        {before ? `${before} ` : ""}
        <mark className={styles.activeWord}>{word}</mark>
        {after ? ` ${after}` : ""}
      </>
    );
  };

  /**
   * Renders the words `[from, to)`, inserting a `<br>` after any word that has
   * a transcript break. Splits the range into sub-ranges only at break points,
   * keeping tag usage minimal.
   *
   * `skipBreakAt` suppresses the `<br>` for a single word index. This is used
   * when a paragraph break coincides with a caption break: the caption break
   * marker is rendered first, and the caller emits the paragraph `<br>` after
   * it (see the segment rendering below).
   */
  const renderRange = (from: number, to: number, skipBreakAt?: number) => {
    // Every break whose word `[from, to)` contains gets a `<br>` after that
    // word. Using `index < to` (rather than `to - 1`) ensures a break on the
    // last word of the range still renders, so breaks are never dropped when a
    // selection boundary happens to fall on the break. Each break index lives
    // in exactly one sub-range, so this never double-renders.
    const breaks = transcriptBreaks.filter(
      (index) => index >= from && index < to && index !== skipBreakAt,
    );

    if (breaks.length === 0) return renderWords(from, to);

    const pieces: React.ReactNode[] = [];
    let cursor = from;

    for (const breakIndex of breaks) {
      pieces.push(
        <Fragment key={`w${cursor}`}>
          {renderWords(cursor, breakIndex + 1)}
        </Fragment>,
        <br key={`br${breakIndex}`} />,
      );
      cursor = breakIndex + 1;
    }

    pieces.push(
      <Fragment key={`w${cursor}`}>{renderWords(cursor, to)}</Fragment>,
    );

    return <>{pieces}</>;
  };

  if (transcript.length === 0) return;

  return (
    <DialogRoot open>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className={styles.CaptionsEditor}>
          <div data-affords="click">
            <div className={styles.actions}>
              {/* save affordance */}
              <Button disabled={saving} onClick={save} type="submit">
                {saving ? (
                  <SpinnerIcon className={styles.spinner} size={16} />
                ) : (
                  <FloppyDiskIcon />
                )}
                {t.save}
              </Button>

              {/* menu for break actions */}
              <MenuRoot>
                <MenuTrigger>
                  <DotsThreeIcon weight="bold" />
                  {t.actions}
                </MenuTrigger>
                <MenuPortal>
                  <MenuPositioner sideOffset={4}>
                    <MenuPopup>
                      <MenuItem
                        onClick={() =>
                          store.setState((state) =>
                            apply(state, {
                              action: "set-caption-breaks",
                              captionBreaks: sentenceBreaks(state.words),
                            }),
                          )
                        }
                      >
                        {t.breakAfterEverySentence}
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          store.setState((state) =>
                            apply(state, {
                              action: "set-caption-breaks",
                              captionBreaks: [],
                            }),
                          )
                        }
                      >
                        {t.clearCaptionBreaks}
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          store.setState((state) =>
                            apply(state, {
                              action: "set-transcript-breaks",
                              transcriptBreaks: [],
                            }),
                          )
                        }
                      >
                        {t.clearParagraphBreaks}
                      </MenuItem>
                    </MenuPopup>
                  </MenuPositioner>
                </MenuPortal>
              </MenuRoot>

              {/* keyboard shortcuts */}
              <DialogRoot>
                <DialogTrigger render={<Button />}>
                  <KeyboardIcon />
                  {t.keyboardShortcuts}
                </DialogTrigger>
                <ShortcutsDialog shortcuts={shortcuts} t={t} />
              </DialogRoot>

              {/* close button */}
              <DialogClose style={{ marginLeft: "auto" }} title={t.close} />
            </div>

            <div className={styles.time}>
              <TimeDuration
                format="milliseconds"
                value={{ ms: transcript[selection.start]![1] }}
              />
              {" → "}
              <TimeDuration
                format="milliseconds"
                value={{ ms: transcript[selection.end]![2] }}
              />
            </div>
            {/** biome-ignore lint/a11y/noStaticElementInteractions: this is fine */}
            {/** biome-ignore lint/a11y/useKeyWithClickEvents: keyboard shortcuts do exist */}
            <div
              className={styles.transcript}
              onClick={onClick}
              onMouseLeave={onMouseLeave}
              onMouseMove={onMouseMove}
            >
              <div className={styles.stripes} ref={stripesRef}>
                {highlight && (
                  <div
                    className={styles.hoverWord}
                    style={{
                      height: highlight.height,
                      left: highlight.left,
                      top: highlight.top,
                      width: highlight.width,
                    }}
                  />
                )}
                {editing && (
                  <input
                    // biome-ignore lint/a11y/noAutofocus: focus is the point of the inline editor
                    autoFocus
                    className={styles.wordInput}
                    data-affords="keys"
                    onBlur={cancelEdit}
                    onChange={(e) => setEditValue(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    style={{
                      left: editing.rect.left,
                      top: editing.rect.top,
                    }}
                    value={editing.value}
                  />
                )}
                {captionSegments(captionBreaks, transcript.length).map(
                  (segment) => {
                    const { startIndex, endIndex, hasCaptionBreak, i } =
                      segment;

                    const hasSelection =
                      between(startIndex, selection.start, endIndex) ||
                      between(startIndex, selection.end, endIndex);

                    const markStart = Math.min(selection.start, endIndex);
                    const markEnd = Math.min(selection.end, endIndex) + 1;

                    // Attach the scroll target to the segment that contains the
                    // selection start (the anchor of a possibly multi-segment mark).
                    const isAnchorSegment = between(
                      startIndex,
                      selection.start,
                      endIndex,
                    );

                    // The caption break falls after the segment's last word. If
                    // that word also has a paragraph break, render the caption
                    // break first and emit the paragraph `<br>` after it, so its
                    // `<br>` is suppressed inside `renderRange` (via
                    // `skipBreakAt`) and re-emitted below.
                    const captionBreakWord = endIndex - 1;
                    const coincidingParagraphBreak =
                      hasCaptionBreak &&
                      transcriptBreaks.includes(captionBreakWord);
                    const skipBreakAt = coincidingParagraphBreak
                      ? captionBreakWord
                      : undefined;

                    const captionBreakMarker = hasCaptionBreak && (
                      <>
                        <span className={styles.captionBreak} />{" "}
                        {coincidingParagraphBreak && <br />}
                      </>
                    );

                    if (!hasSelection) {
                      return (
                        <Fragment key={`${startIndex}/${i}`}>
                          {renderRange(startIndex, endIndex, skipBreakAt)}{" "}
                          {captionBreakMarker}
                        </Fragment>
                      );
                    }

                    return (
                      <Fragment key={`${startIndex}/${i}`}>
                        {renderRange(startIndex, markStart, skipBreakAt)}{" "}
                        {hasSelection && (
                          <>
                            <mark
                              className={styles.selection}
                              key={selection.start}
                              ref={isAnchorSegment ? selectionRef : undefined}
                            >
                              {renderRange(markStart, markEnd, skipBreakAt)}
                            </mark>{" "}
                          </>
                        )}
                        {renderRange(markEnd, endIndex, skipBreakAt)}{" "}
                        {captionBreakMarker}
                      </Fragment>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </DialogPopup>
        <CaptionsPreview store={store} {...displayProps} />
      </DialogPortal>
    </DialogRoot>
  );
}

type CaptionSegment = {
  /** Segment index (matches the caption break index, or one past the last). */
  i: number;

  /** First word index of the segment (inclusive). */
  startIndex: number;

  /** One past the last word index of the segment (exclusive). */
  endIndex: number;

  /** Whether a caption break marker follows this segment. */
  hasCaptionBreak: boolean;
};

/**
 * Returns caption break indices after every sentence, i.e. after each token
 * ending in one of `.!?`. The final token is excluded since a break there is redundant.
 */
function sentenceBreaks(transcript: Transcript): number[] {
  const breaks: number[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    if (isSentenceEnd(transcript[i]!)) breaks.push(i);
  }

  return breaks;
}

/**
 * Splits the transcript into caption segments. Each caption break ends a
 * segment (and renders a break marker); the words after the final break form a
 * trailing segment with no marker.
 */
function captionSegments(
  captionBreaks: readonly number[],
  length: number,
): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let startIndex = 0;

  for (let i = 0; i < captionBreaks.length; i++) {
    const endIndex = captionBreaks[i]! + 1;
    segments.push({ endIndex, hasCaptionBreak: true, i, startIndex });
    startIndex = endIndex;
  }

  // Trailing segment from the last break to the end of the transcript.
  if (startIndex < length) {
    segments.push({
      endIndex: length,
      hasCaptionBreak: false,
      i: captionBreaks.length,
      startIndex,
    });
  }

  return segments;
}

function CaptionsPreview({
  store,
  ...props
}: { store: Store } & React.HTMLAttributes<HTMLElement>) {
  const { captionBreaks } = store.getState();

  const playback = usePlayback();

  const captionIndex = useRef(0);

  const cappedCaptionStart = (index: number) =>
    index === 0 ? 0 : captionBreaks[index - 1]! + 1;

  const getCurrentCaption = () => {
    const { captionBreaks, words: transcript } = store.getState();
    const t = playback.currentTime$.inMilliseconds();

    if (transcript.length === 0) return "";

    if (transcript[cappedCaptionStart(captionIndex.current)]![1] > t) {
      captionIndex.current = Math.max(0, captionIndex.current - 1);
      for (
        let i = captionIndex.current;
        i >= 0 && transcript[cappedCaptionStart(i)]![1] > t;
        i--
      ) {
        captionIndex.current = i;
      }
    } else if (transcript[captionBreaks[captionIndex.current]!]![2] < t) {
      captionIndex.current++;
      for (
        let i = captionIndex.current;
        i < captionBreaks.length && transcript[captionBreaks[i]!]![2] < t;
        i++
      ) {
        captionIndex.current = i;
      }
    }

    return join(
      transcript.slice(
        cappedCaptionStart(captionIndex.current),
        captionBreaks[captionIndex.current]! + 1,
      ),
    );
  };

  const [caption, setCaption] = useState(() => getCurrentCaption());

  usePlaybackEvent("timeupdate", () => {
    setCaption(getCurrentCaption());
  });

  useEffect(() => {
    const unsubs: CleanUpFn[] = [];
    unsubs.push(
      store.subscribe(
        (state) => state.captionBreaks,
        () => setCaption(getCurrentCaption()),
      ),
    );

    unsubs.push(
      store.subscribe(
        (state) => state.words,
        () => setCaption(getCurrentCaption()),
      ),
    );

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  });

  return <div {...props}>{caption}</div>;
}

function join(words: readonly TranscriptEntry[]) {
  return words.reduce(
    (acc, curr, index) => acc + (index > 0 ? " " : "") + curr[0],
    "",
  );
}

/**
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
function useSelectOnClick(store: Store) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget.querySelector<HTMLElement>(
      `.${styles.stripes}`,
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

/** Position of the hover highlight, relative to the `.stripes` content box. */
type Highlight = { left: number; top: number; width: number; height: number };

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
function useHoverHighlight(
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
}

/**
 * Returns the box of `wordIndex` in coordinates relative to the `.stripes`
 * content box (accounting for scroll offset, so the box stays pinned to the
 * word as the transcript scrolls), or `null` if it cannot be resolved.
 */
function wordRectRelativeToStripes(
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

/** State of an in-progress word edit. */
type WordEdit = { index: number; value: string; rect: Highlight };

/**
 * Manages inline editing of a word via an absolutely-positioned `<input>`.
 *
 * The input is not mounted inside the transcript markup (which would complicate
 * the DOM the click/hover word-mapping relies on); instead the caller renders
 * it as an overlay in the `.stripes` box, positioned over the word via
 * {@link wordRectRelativeToStripes}. `begin` seeds the input with the word's
 * text; `commit` dispatches a `change-word`; `cancel` aborts.
 */
function useWordEditor(
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
function wordIndexAtCaret(
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

/**
 * Resolves the caret (node + offset) at the given viewport coordinates,
 * bridging the standard `caretPositionFromPoint` and WebKit's legacy
 * `caretRangeFromPoint`.
 */
function caretPositionFromPoint(
  x: number,
  y: number,
): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }

  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    return range
      ? { node: range.startContainer, offset: range.startOffset }
      : null;
  }

  return null;
}
