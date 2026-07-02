/** biome-ignore-all lint/suspicious/noExplicitAny: don't have good types yet */
"use client";

import { useRecordingApi } from "@liqvid/recording";
import { Portal, useDraggable, useResizable } from "@liqvid/studio/ui";
import clsx from "clsx";
import { type JSX, useEffect, useRef, useState } from "react";

import type { LiqvidMediaRecorder } from "./LiqvidMediaRecorder.mts";

const initialHeight = 300;

/**
 * Display a preview of the user's camera to them.
 * @scope *
 */
export function CameraPreview({
  className,
  ...props
}: JSX.IntrinsicElements["video"] & {}) {
  const { plugins } = useRecordingApi();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragEvents = useDraggable(containerRef);
  const { getHandleProps } = useResizable(containerRef, {
    aspectRatio: true,
    minHeight: 75,
    minWidth: 100,
  });

  const [stream, setStream] = useState<MediaStream | null>(null);

  // Subscribe to stream changes from the media recorder
  useEffect(() => {
    const plugin = plugins["@liqvid/media"] as any;
    const mediaRecorder = plugin?.recorder as LiqvidMediaRecorder | undefined;

    if (!mediaRecorder) return;

    // Set initial stream
    setStream(mediaRecorder.stream);

    // Listen for stream changes
    const handleStreamChange = (newStream: MediaStream | null) => {
      setStream(newStream);
    };

    mediaRecorder.addEventListener("streamchange", handleStreamChange);

    return () => {
      mediaRecorder.removeEventListener("streamchange", handleStreamChange);
    };
  }, [plugins]);

  // Update video element when stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;

    if (stream) {
      video.play().catch((e) => {
        console.warn(e);
      });
    }
  }, [stream]);

  return (
    <Portal>
      <div
        className="fixed z-wizard"
        ref={containerRef}
        style={{
          left: "80%",
          top: `calc(100% - ${initialHeight}px)`,
        }}
        {...dragEvents}
      >
        <video
          className={clsx("bg-gray-100", className)}
          muted
          {...props}
          ref={videoRef}
          style={{
            backgroundImage: `repeating-linear-gradient(
                -45deg,
                #aaa 0px,
                #aaa 5px,
                #eee 5px,
                #eee 10px
              )`,
            height: initialHeight,
          }}
        />
        {/* Resize handles */}
        <div {...getHandleProps("nw")} />
        <div {...getHandleProps("ne")} />
        <div {...getHandleProps("sw")} />
        <div {...getHandleProps("se")} />
      </div>
    </Portal>
  );
}
