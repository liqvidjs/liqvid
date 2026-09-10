"use client";

import { useTime } from "@liqvid/playback/react";
import type { RichTranscript } from "@liqvid/schemas";
import { useProjectPath } from "@liqvid/studio-plugin-api";
import type { Awaitable } from "@liqvid/utils";
import { between } from "@liqvid/utils";
import {
  DotsThreeIcon,
  FloppyDiskIcon,
  KeyboardIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { RelativeDir } from "effect-paths";
import { Fragment, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { Spinner } from "#_/components/Spinner.js";
import { useChannel } from "#_/components/WebSocketProvider.js";
import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import type { Transcript } from "#_/types/schemas.mjs";
import { Button } from "#_/ui/Button.js";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTrigger,
} from "#_/ui/Dialog.js";
import {
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from "#_/ui/Menu.js";
import { TimeDuration } from "#_/ui/Time.js";
import { useAsyncTranslations } from "#_/utils/react.js";

import { CaptionsPreview } from "./CaptionsPreview.tsx";
import {
  useCaptionsEditorShortcuts,
  useHoverHighlight,
  useSelectOnClick,
  useWordEditor,
} from "./hooks.ts";
import { ShortcutsDialog } from "./ShortcutsDialog.tsx";
import { saveCaptions } from "./server.ts";
import type { Shortcuts } from "./shortcuts.ts";
import { makeStore } from "./store.ts";
import { activeWordIndex, apply, isSentenceEnd, join } from "./utils.ts";

import Translations from "./.translations/en.json";

const styles = stylex.create({
  actions: {
    alignItems: "center",
    columnGap: "0.5em",
    display: "flex",
    rowGap: "0.5em",
  },

  activeWord: {
    background: "transparent",
    borderRadius: radii.sm,
    color: colors.accentSolid,
  },
  CaptionsEditor: {
    height: "max-content",
    maxWidth: "unset",
    width: "max-content",
  },

  captionBreak: {
    "::after": {
      background: "gray",
      content: '""',
      display: "inline-block",
      height: "1em",
      verticalAlign: "middle",
      width: "1px",
    },
    position: "relative",
  },
  closeButton: {
    marginLeft: spacing.auto,
  },

  hoverWord: {
    background: "light-dark(rgba(0, 0, 0, 8%), rgba(255, 255, 255, 10%))",
    borderRadius: radii.sm,
    boxSizing: "content-box",
    paddingBlock: spacing.xs,
    paddingInline: spacing.sm,
    pointerEvents: "none",
    position: "absolute",
    translate: "-2px -1px",
    zIndex: 1,
  },

  selection: {
    "::before": {
      background: "light-dark(#acf, #79e)",
      borderRadius: radii.sm,
      boxSizing: "content-box",
      content: '""',
      height: "100%",
      left: 0,
      marginBlock: spacing.negXs,
      marginInline: spacing.negMd,
      paddingBlock: spacing.xs,
      paddingInline: spacing.md,
      position: "absolute",
      top: 0,
      width: "100%",
      zIndex: -1,
    },
    background: "light-dark(#acf, #79e)",
    color: colors.inherit,
    position: "relative",
    zIndex: 0,
  },

  stripes: {
    backgroundImage: `repeating-linear-gradient(
      light-dark(#f6f6f6, #333) 0,
      light-dark(#f6f6f6, #333) calc(1.5em - 1px),
      light-dark(#ddd, #4a4a4a) calc(1.5em - 1px),
      light-dark(#ddd, #4a4a4a) calc(1.5em),
      light-dark(#e8e8e8, #3f3f3f) calc(1.5em),
      light-dark(#e8e8e8, #3f3f3f) calc(3em - 1px),
      light-dark(#ddd, #4a4a4a) calc(3em - 1px),
      light-dark(#ddd, #4a4a4a) calc(3em)
    )`,
    cursor: "pointer",
    paddingBlock: spacing.zero,
    paddingInline: spacing.md,
    position: "relative",
  },

  time: {
    color: colors.grayDim,
    fontFamily: typeface.mono,
    fontSize: text.md,
    marginBlock: spacing.md,
    marginInline: spacing.zero,
  },

  transcript: {
    borderColor: colors.graySep,
    borderRadius: radii.sm,
    borderStyle: "solid",
    borderWidth: dims.sep,
    height: "50vh",
    lineHeight: 1.5,
    marginBlock: spacing.md,
    marginInline: spacing.zero,
    overflow: "auto",
    width: "75vw",
  },

  wordInput: {
    background: colors.grayApp,
    borderColor: colors.accentSolid,
    borderRadius: radii.sm,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.inherit,
    font: "inherit",
    minWidth: "4em",
    outline: "none",
    paddingBlock: spacing.xs,
    paddingInline: spacing.sm,
    position: "absolute",
    translate: "-2px -1px",
    zIndex: 2,
  },
});

export function CaptionsEditor({
  displayProps = {},
  shortcuts = {},
  transcript: propTranscript,
  ...props
}: {
  className?: string;
  displayProps?: React.HTMLAttributes<HTMLDivElement>;
  shortcuts?: Partial<Shortcuts>;
  transcript: Awaitable<RichTranscript>;
}) {
  const [store] = useState(() => makeStore());
  const projectPath = useProjectPath();

  useChannel("jobs", {
    deleteJob: () => {},
  });

  const t = useAsyncTranslations(
    Translations,
    "src/components/CaptionsEditor" as RelativeDir,
  );

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
        <mark sx={styles.activeWord}>{word}</mark>
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

  const hoverWordSx = stylex.props(styles.hoverWord);
  const wordInputSx = stylex.props(styles.wordInput);

  return (
    <DialogRoot {...props}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup {...stylex.props(styles.CaptionsEditor)}>
          <div data-affords="click">
            <div sx={styles.actions}>
              {/* save affordance */}
              <Button disabled={saving} onClick={save} type="submit">
                {saving ? <Spinner size={16} /> : <FloppyDiskIcon />}
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
              <DialogClose style={styles.closeButton} title={t.close} />
            </div>

            <div sx={styles.time}>
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
              onClick={onClick}
              onMouseLeave={onMouseLeave}
              onMouseMove={onMouseMove}
              sx={styles.transcript}
            >
              <div data-role="stripes" ref={stripesRef} sx={styles.stripes}>
                {highlight && (
                  <div
                    className={hoverWordSx.className}
                    style={{
                      ...hoverWordSx.style,
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
                    className={wordInputSx.className}
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
                      ...wordInputSx.style,
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
                        <span sx={styles.captionBreak} />{" "}
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
                              key={selection.start}
                              ref={isAnchorSegment ? selectionRef : undefined}
                              sx={styles.selection}
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
          <CaptionsPreview store={store} {...displayProps} />
        </DialogPopup>
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

/**
 * Resolves the caret (node + offset) at the given viewport coordinates,
 * bridging the standard `caretPositionFromPoint` and WebKit's legacy
 * `caretRangeFromPoint`.
 */
export function caretPositionFromPoint(
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
