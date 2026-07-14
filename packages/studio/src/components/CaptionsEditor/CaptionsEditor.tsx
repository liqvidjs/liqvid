"use client";

import type { TranscriptEntry } from "@liqvid/cli/transcribe";
import { useEventListener } from "@liqvid/event-emitter/react";
import { between, parseTime } from "@liqvid/utils";
import { Fragment, useEffect, useState } from "react";
import { useStore } from "zustand";

import type { Transcript } from "../../types/schemas.mts";
import type { Awaitable } from "../../types.mts";

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
    }
  });

  const { captionBreaks, selection, transcript } = useStore(store);

  if (transcript.length === 0) return;

  return (
    <div className={styles.CaptionsEditor} data-affords="click">
      <pre>
        {`${selection.start}:${selection.end} `}
        {captionBreaks.slice(0, 2).join(", ")}
      </pre>
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

            if (hasSelection)
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
  );
}

function join(words: readonly TranscriptEntry[]) {
  return words.reduce(
    (acc, curr, index) => acc + (index > 0 ? " " : "") + curr[0],
    "",
  );
}
