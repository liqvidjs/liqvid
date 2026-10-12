"use client";

import { combineRefs } from "@liqvid/utils";
import { Children, isValidElement, type JSX, useRef } from "react";

import { useLoadHold } from "./useLoadHold.ts";
import { type MediaProps, useSyncMedia } from "./useSyncMedia.ts";

type VideoProps = JSX.IntrinsicElements["video"] & MediaProps;

/**
 * Liqvid equivalent of {@link HTMLVideoElement `<video>`}.
 */
export function Video({ defer, ref: propsRef, start, ...props }: VideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const held = useLoadHold(defer);
  const { children, src, ...rest } = props;
  const hasSource =
    Boolean(src) ||
    Children.toArray(children).some(
      (child) =>
        isValidElement(child) &&
        child.type === "source" &&
        Boolean((child.props as { src?: string }).src),
    );

  useSyncMedia(ref, start, !held && hasSource);

  return (
    <video
      playsInline
      preload="auto"
      ref={combineRefs(ref, propsRef)}
      {...rest}
      src={held ? undefined : src}
    >
      {held ? undefined : children}
    </video>
  );
}
