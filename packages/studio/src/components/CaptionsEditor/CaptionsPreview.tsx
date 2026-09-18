"use client";

import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { usePlayer } from "@liqvid/player";
import type { CleanUpFn } from "@liqvid/utils";
import { Portal } from "@radix-ui/react-portal";
import { useEffect, useRef, useState } from "react";

import type { Store } from "./store.ts";
import { join } from "./utils.ts";

export function CaptionsPreview({
  store,
  ...props
}: { store: Store } & React.HTMLAttributes<HTMLElement>) {
  const { domElement } = usePlayer();

  const playback = usePlayback();

  const captionIndex = useRef(0);

  const getCurrentCaption = () => {
    const { captionBreaks, words: transcript } = store.getState();
    const t = playback.currentTime$.inMilliseconds();

    if (transcript.length === 0) return "";

    // There is one more caption than there are breaks: the final caption has
    // no corresponding entry in captionBreaks.
    const cappedCaptionStart = (index: number) =>
      index === 0 ? 0 : captionBreaks[index - 1]! + 1;
    captionIndex.current = Math.min(captionIndex.current, captionBreaks.length);

    if (transcript[cappedCaptionStart(captionIndex.current)]![1] > t) {
      captionIndex.current = Math.max(0, captionIndex.current - 1);
      for (
        let i = captionIndex.current;
        i >= 0 && transcript[cappedCaptionStart(i)]![1] > t;
        i--
      ) {
        captionIndex.current = i;
      }
    } else if (
      captionIndex.current < captionBreaks.length &&
      transcript[captionBreaks[captionIndex.current]!]![2] < t
    ) {
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
        captionIndex.current < captionBreaks.length
          ? captionBreaks[captionIndex.current]! + 1
          : transcript.length,
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

  return (
    <Portal container={domElement}>
      <div {...props}>{caption}</div>
    </Portal>
  );
}
