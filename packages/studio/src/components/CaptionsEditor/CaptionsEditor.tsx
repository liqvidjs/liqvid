"use client";

import type { TranscriptEntry } from "@liqvid/cli/transcribe";
import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback, usePlaybackEvent, useTime } from "@liqvid/playback/react";
import {
  between,
  type CleanUpFn,
  formatTimeMs,
  isMac,
  parseTime,
  pick,
} from "@liqvid/utils";
import { Fragment, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { useStudioPrivateApi } from "../../LiqvidDevToolsProvider.tsx";
import type { Transcript } from "../../types/schemas.mts";
import type { Awaitable } from "../../types.mts";
import { Button } from "../../ui/Button.tsx";

import { saveCaptions } from "./server.ts";
import { makeStore } from "./store.ts";
import { apply, redo, undo } from "./utils.ts";

import styles from "./CaptionsEditor.module.css";

type Shortcuts = {
  /** Move the cursor one word backward. */
  selectionBackward: string;

  /** Move the cursor one word forward. */
  selectionForward: string;

  /** Move the cursor to the start of the previous sentence. */
  startPrevSentence: string;

  /** Move the cursor to the end of the next sentence. */
  endNextSentence: string;

  /** Move the cursor to the start of the previous caption. */
  startPrevCaption: string;

  /** Move the cursor to the end of the next caption. */
  endNextCaption: string;

  /** Toggle a caption break at the current cursor position. */
  toggleCaptionBreak: string;

  /** Move the cursor to the start of the previous transcript break. */
  startPrevTranscriptBreak: string;

  /** Move the cursor to the end of the next transcript break. */
  endNextTranscriptBreak: string;

  /** Toggle a transcript break at the current cursor position. */
  toggleTranscriptBreak: string;

  /** Seek playback to the start time of the currently selected word. */
  seekToSelection: string;

  /** Save the current captions and transcript. */
  save: string;
};

const defaultShortcuts: Shortcuts = {
  endNextCaption: "]",
  endNextSentence: ")",
  endNextTranscriptBreak: "}",
  save: "s",
  seekToSelection: "g",
  selectionBackward: "w",
  selectionForward: "e",
  startPrevCaption: "[",
  startPrevSentence: "(",
  startPrevTranscriptBreak: "{",
  toggleCaptionBreak: "\\",
  toggleTranscriptBreak: "|",
};

export function CaptionsEditor({
  shortcuts = {},
  transcript: propTranscript,
  vtt,
}: {
  shortcuts?: Partial<Shortcuts>;
  transcript: Awaitable<Transcript>;
  vtt: Awaitable<string>;
}) {
  const keys = { ...defaultShortcuts, ...shortcuts };
  const [store] = useState(() => makeStore());
  const { projectPath } = useStudioPrivateApi();
  const playback = usePlayback();

  useEffect(() => {
    Promise.all([propTranscript, vtt]).then(([transcript, vtt]) => {
      let cursor = 0;
      const captionBreaks: number[] = [];
      const lines = vtt.matchAll(
        /^(\d\d:\d\d:\d\d\.\d\d\d) --> (\d\d:\d\d:\d\d\.\d\d\d)/gm,
      ) as unknown as RegExpStringIterator<[string, string, string]>;

      for (const [, , end] of lines) {
        const endTime = parseTime(end);

        for (; cursor < transcript.length; cursor++) {
          const [, , wordEnd] = transcript[cursor]!;

          if (wordEnd > endTime) {
            captionBreaks.push(cursor - 1);
            break;
          }
        }
      }

      store.setState({ captionBreaks, transcript });
    });
  }, [propTranscript, store, vtt]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log(document.getSelection());
  };

  useEventListener(globalThis?.window, "keydown", (e) => {
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
        const { selection, transcript } = store.getState();
        const word = transcript[selection.start];
        if (word) {
          playback.currentTime$ = { milliseconds: word[1] };
        }
        break;
      }
      case "s": {
        if (!hasModKey(e)) return;
        e.preventDefault();
        const { captionBreaks, transcript } = store.getState();
        saveCaptions({ captionBreaks, projectPath, transcript });
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

  const { captionBreaks, selection, transcript, transcriptBreaks } =
    useStore(store);

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
   */
  const renderRange = (from: number, to: number) => {
    // Every break whose word `[from, to)` contains gets a `<br>` after that
    // word. Using `index < to` (rather than `to - 1`) ensures a break on the
    // last word of the range still renders, so breaks are never dropped when a
    // selection boundary happens to fall on the break. Each break index lives
    // in exactly one sub-range, so this never double-renders.
    const breaks = transcriptBreaks.filter(
      (index) => index >= from && index < to,
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
    <>
      <div className={styles.backdrop} />
      <div className={styles.CaptionsEditor} data-affords="click">
        <pre>
          {`${formatTimeMs(transcript[selection.start]![1])} -> ${formatTimeMs(transcript[selection.end]![2])} `}
        </pre>
        <pre>
          {JSON.stringify(
            pick(store.getState(), [
              //"captionBreaks",
              "selection",
              "transcriptBreaks",
            ]),
          )}
        </pre>
        <Button
          onClick={() =>
            saveCaptions({ captionBreaks, projectPath, transcript })
          }
          type="submit"
        >
          Save
        </Button>
        {/** biome-ignore lint/a11y/noStaticElementInteractions: this is fine */}
        {/** biome-ignore lint/a11y/useKeyWithClickEvents: keyboard shortcuts do exist */}
        <div className={styles.transcript} onClick={onClick}>
          <div className={styles.stripes}>
            {captionSegments(captionBreaks, transcript.length).map((segment) => {
              const { startIndex, endIndex, hasCaptionBreak, i } = segment;

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

              if (!hasSelection) {
                return (
                  <Fragment key={`${startIndex}/${i}`}>
                    {renderRange(startIndex, endIndex)}{" "}
                    {hasCaptionBreak && (
                      <>
                        <span className={styles.captionBreak} />{" "}
                      </>
                    )}
                  </Fragment>
                );
              }

              return (
                <Fragment key={`${startIndex}/${i}`}>
                  {renderRange(startIndex, markStart)}{" "}
                  {hasSelection && (
                    <>
                      <mark
                        className={styles.selection}
                        key={selection.start}
                        ref={isAnchorSegment ? selectionRef : undefined}
                      >
                        {renderRange(markStart, markEnd)}
                      </mark>{" "}
                    </>
                  )}
                  {renderRange(markEnd, endIndex)}{" "}
                  {hasCaptionBreak && (
                    <>
                      <span className={styles.captionBreak} />{" "}
                    </>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
      <CaptionsPreview store={store} />
    </>
  );
}

/** Returns true if Cmd on Mac, or Ctrl on other platforms, is pressed. */
function hasModKey(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
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

function CaptionsPreview({ store }: { store: ReturnType<typeof makeStore> }) {
  const { captionBreaks } = store.getState();

  const playback = usePlayback();

  const captionIndex = useRef(0);

  const cappedCaptionStart = (index: number) =>
    index === 0 ? 0 : captionBreaks[index - 1]! + 1;

  const getCurrentCaption = () => {
    const { captionBreaks, transcript } = store.getState();
    const t = playback.currentTime * 1000;

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
        (state) => state.transcript,
        () => setCaption(getCurrentCaption()),
      ),
    );

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  });

  return <aside className={styles.preview}>{caption}</aside>;
}

function join(words: readonly TranscriptEntry[]) {
  return words.reduce(
    (acc, curr, index) => acc + (index > 0 ? " " : "") + curr[0],
    "",
  );
}

/**
 * Returns the index of the word active at time `t` (in ms), or -1 if none.
 */
function activeWordIndex(transcript: Transcript, t: number): number {
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
