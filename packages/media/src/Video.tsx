"use client";

import { Duration } from "@liqvid/duration";
import { combineRefs } from "@liqvid/utils";
import { type JSX, useRef } from "react";

import { type MediaProps, useSyncMedia } from "./useSyncMedia.ts";

type VideoProps = JSX.IntrinsicElements["video"] & MediaProps;

/**
 * Liqvid equivalent of {@link HTMLVideoElement `<video>`}.
 */
export function Video({ ref: propsRef, start, ...props }: VideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useSyncMedia(ref, Duration.from(start ?? { seconds: 0 }).inSeconds());

  return (
    <video
      playsInline
      preload="auto"
      ref={combineRefs(ref, propsRef)}
      {...props}
    />
  );
}
