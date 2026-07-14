"use client";

import type { TranscriptEntry } from "@liqvid/cli/transcribe";
import { useEventListener } from "@liqvid/event-emitter/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import {
  between,
  type CleanUpFn,
  formatTimeMs,
  isMac,
  parseTime,
} from "@liqvid/utils";
import { Fragment, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { useStudioPrivateApi } from "../../LiqvidDevToolsProvider.tsx";
import type { Transcript } from "../../types/schemas.mts";
import type { Awaitable } from "../../types.mts";
import { Button } from "../../ui/Button.tsx";

import { saveCaptions } from "./server.ts";
import { makeStore } from "./store.ts";
import { apply } from "./utils.ts";

import styles from "./CaptionsEditor.module.css";

export function CaptionsEditor({
  transcript: propTranscript,
  vtt,
}: {
  transcript: Awaitable<Transcript>;
  vtt: Awaitable<string>;
}) {
  const [store] = useState(() => makeStore());
  const { projectPath } = useStudioPrivateApi();

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
      case "w":
        store.setState((state) =>
          apply(state, { action: "selection-backward" }),
        );
        break;
      case "e":
        store.setState((state) =>
          apply(state, { action: "selection-forward" }),
        );
        break;
      case "(":
        store.setState((state) =>
          apply(state, { action: "start-prev-sentence" }),
        );
        break;
      case ")":
        store.setState((state) =>
          apply(state, { action: "end-next-sentence" }),
        );
        break;
      case "[":
        store.setState((state) =>
          apply(state, { action: "start-prev-caption" }),
        );
        break;
      case "]":
        store.setState((state) => apply(state, { action: "end-next-caption" }));
        break;
      case "\\":
        store.setState((state) =>
          apply(state, { action: "toggle-caption-break" }),
        );
        break;

      case "s":
        if (isMac ? e.metaKey : e.ctrlKey) {
          e.preventDefault();
          const { captionBreaks, transcript } = store.getState();
          saveCaptions({ captionBreaks, projectPath, transcript });
          break;
        }
    }
  });

  const { captionBreaks, selection, transcript } = useStore(store);

  if (transcript.length === 0) return;

  return (
    <>
      <div className={styles.CaptionsEditor} data-affords="click">
        <pre>
          {`${formatTimeMs(transcript[selection.start]![1])} -> ${formatTimeMs(transcript[selection.end]![2])} `}
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
            {captionBreaks.map((breakIndex, i) => {
              const startIndex = i === 0 ? 0 : captionBreaks[i - 1]! + 1;
              const endIndex = breakIndex + 1;

              const hasSelection =
                between(startIndex, selection.start, endIndex) ||
                between(startIndex, selection.end, endIndex);

              const markStart = Math.min(selection.start, endIndex);
              const markEnd = Math.min(selection.end, endIndex) + 1;

              if (!hasSelection) {
                return (
                  <Fragment key={`${breakIndex}/${i}`}>
                    {join(transcript.slice(startIndex, endIndex))}{" "}
                    <span className={styles.captionBreak} />{" "}
                  </Fragment>
                );
              }

              return (
                <Fragment key={`${breakIndex}/${i}`}>
                  {join(transcript.slice(startIndex, markStart))}{" "}
                  {hasSelection && (
                    <>
                      <mark className={styles.selection} key={selection.start}>
                        {join(transcript.slice(markStart, markEnd))}
                      </mark>{" "}
                    </>
                  )}
                  {join(transcript.slice(markEnd, endIndex))}{" "}
                  <span className={styles.captionBreak} />{" "}
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
