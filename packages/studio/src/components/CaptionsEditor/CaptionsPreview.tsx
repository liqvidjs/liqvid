"use client";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import type { CleanUpFn } from "@liqvid/utils";
import { useEffect, useRef, useState } from "react";

import type { Store } from "./store.ts";
import { join } from "./utils.ts";

export function CaptionsPreview({
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
