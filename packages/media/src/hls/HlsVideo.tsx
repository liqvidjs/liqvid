"use client";

import type { DurationLike } from "@liqvid/duration";
import { useEffect, useRef, useState } from "react";

import { useLoadHold } from "../useLoadHold.ts";
import { useSyncMedia } from "../useSyncMedia.ts";
import { Video } from "../Video.tsx";

import type { GreenScreenConfig } from "./greenscreen.ts";
import { joinHls } from "./join-hls.ts";
import { useMediaBunnyFrames } from "./useMediaBunnyFrames.ts";

export interface HlsVideoProps {
  children?: React.ReactNode;
  className?: string;

  /**
   * The HLS playlist will not start loading until this promise resolves.
   * (By default, it starts loading on mount).
   */
  defer?: Promise<void>;

  draggable?: boolean;

  filename?: string;

  /**
   * Render decoded MediaBunny frames at the current Liqvid time. Enable this
   * for static rendering that must not depend on HTMLVideoElement seek timing.
   */
  frameAccurate?: boolean;

  /** Enable greenscreen effect (turns specified color pixels transparent) */
  greenscreen?: boolean | GreenScreenConfig;

  hls?: string | readonly string[];

  /**
   * Number of seconds ahead of the current time to preload HLS segments.
   * In MediaBunny mode, omitting this loads only the next segment. Supplying a
   * value opts into MediaBunny rendering so the prefetch distance is bounded.
   */
  preload?: number | DurationLike;

  /** Liqvid time at which this HLS video begins. */
  start?: DurationLike;

  style?: React.CSSProperties;
}

export function HlsVideo({
  defer,
  frameAccurate = false,
  greenscreen = false,
  hls,
  preload,
  start,
  style,
  ...props
}: HlsVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const source = useHlsSource(hls, defer);
  const [nativeHls, setNativeHls] = useState(false);
  const useNativeSource =
    nativeHls && Boolean(source) && !source?.startsWith("data:");
  const useCanvas =
    frameAccurate ||
    Boolean(greenscreen) ||
    preload !== undefined ||
    !useNativeSource;

  useEffect(() => {
    const video = document.createElement("video");
    setNativeHls(Boolean(video.canPlayType("application/vnd.apple.mpegurl")));
  }, []);

  useMediaBunnyFrames({
    canvasRef,
    enabled: useCanvas,
    greenscreen,
    preload,
    source,
    start,
  });

  if (useCanvas) {
    return (
      <div style={style} {...props}>
        {useNativeSource && source && (
          <NativeAudio src={source} start={start}>
            {props.children}
          </NativeAudio>
        )}
        <canvas className="h-full w-auto" ref={canvasRef} />
      </div>
    );
  }

  return (
    <Video
      preload="metadata"
      src={source}
      start={start}
      style={style}
      {...props}
    >
      {props.children}
    </Video>
  );
}

/**
 * Plays the stream's audio while frames are drawn to the canvas. An `<audio>`
 * element avoids decoding the video a second time.
 */
function NativeAudio({
  children,
  src,
  start,
}: {
  children?: React.ReactNode;
  src: string;
  start?: DurationLike;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  useSyncMedia(ref, start);

  return (
    // biome-ignore lint/a11y/useMediaCaption: caption tracks are passed through as children
    <audio preload="metadata" ref={ref} src={src}>
      {children}
    </audio>
  );
}

function useHlsSource(
  hls: HlsVideoProps["hls"],
  defer?: Promise<void>,
): string | undefined {
  const [source, setSource] = useState<string>();
  const held = useLoadHold(defer);

  useEffect(() => {
    if (held) return;

    if (!hls) {
      setSource(undefined);
      return;
    }

    if (typeof hls === "string") {
      setSource(hls);
      return;
    }

    let active = true;
    setSource(undefined);
    joinHls(hls)
      .then((joinedSource) => {
        if (active) setSource(joinedSource);
      })
      .catch((error: unknown) => {
        if (active) console.error("Failed to join HLS playlists", error);
      });

    return () => {
      active = false;
    };
  }, [held, hls]);

  return source;
}
