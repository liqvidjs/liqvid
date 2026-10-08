"use client";

import type { DurationLike } from "@liqvid/duration";
import { useEffect, useRef, useState } from "react";

import { Video } from "../Video.tsx";

import type { GreenScreenConfig } from "./greenscreen.ts";
import { joinHls } from "./join-hls.ts";
import { useMediaBunnyFrames } from "./useMediaBunnyFrames.ts";

export interface HlsVideoProps {
  children?: React.ReactNode;
  className?: string;

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

  /** Liqvid time at which this HLS video begins. */
  start?: DurationLike;

  style?: React.CSSProperties;
}

export function HlsVideo({
  frameAccurate = false,
  greenscreen = false,
  hls,
  start,
  style,
  ...props
}: HlsVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const source = useHlsSource(hls);
  const [nativeHls, setNativeHls] = useState(false);
  const useNativeSource =
    nativeHls && Boolean(source) && !source?.startsWith("data:");
  const useCanvas = frameAccurate || Boolean(greenscreen) || !useNativeSource;

  useEffect(() => {
    const video = document.createElement("video");
    setNativeHls(Boolean(video.canPlayType("application/vnd.apple.mpegurl")));
  }, []);

  useMediaBunnyFrames({
    canvasRef,
    enabled: useCanvas,
    greenscreen,
    source,
    start,
  });

  if (useCanvas) {
    return (
      <div style={style} {...props}>
        {useNativeSource && (
          <Video className="invisible absolute" src={source} start={start}>
            {props.children}
          </Video>
        )}
        <canvas className="h-full w-auto" ref={canvasRef} />
      </div>
    );
  }

  return (
    <Video src={source} start={start} style={style} {...props}>
      {props.children}
    </Video>
  );
}

function useHlsSource(hls: HlsVideoProps["hls"]): string | undefined {
  const [source, setSource] = useState<string>();

  useEffect(() => {
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
    void joinHls(hls)
      .then((joinedSource) => {
        if (active) setSource(joinedSource);
      })
      .catch((error: unknown) => {
        if (active) console.error("Failed to join HLS playlists", error);
      });

    return () => {
      active = false;
    };
  }, [hls]);

  return source;
}
