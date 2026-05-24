/** biome-ignore-all lint/suspicious/noExplicitAny: don't have good types yet */
"use client";

import { Maybe, None } from "@liqvid/fp";
import { useRecordingApi } from "@liqvid/recording";
import { Portal, useDraggable } from "@liqvid/studio/ui";
import clsx from "clsx";
import {
  type JSX,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import type { LiqvidMediaRecorder } from "./LiqvidMediaRecorder.mts";

/**
 * Display a preview of the user's camera to them.
 * @scope *
 */
export function CameraPreview({
  className,
  ...props
}: JSX.IntrinsicElements["video"] & {}) {
  const { plugins } = useRecordingApi();

  const ref = useRef<HTMLVideoElement>(null);
  const events = useDraggable(ref);

  const $video = useWaitFor(useCallback(() => Maybe.nullish(ref.current), []));
  const $stream = useWaitFor(() => {
    const plugin = plugins["@liqvid/media"] as any;
    const mediaRecorder = plugin.recorder as LiqvidMediaRecorder;

    return Maybe.nullish(mediaRecorder?.stream);
  });

  useEffect(() => {
    if ($video.isNone) return;
    const video = $video.unwrap();

    if ($stream.isNone) return;
    const stream = $stream.unwrap();

    video.srcObject = stream;
    video.play();
  }, [$stream, $video]);

  return (
    <Portal>
      <video
        className={clsx("fixed z-wizard h-[300px] bg-gray-100", className)}
        muted
        {...events}
        {...props}
        ref={ref}
        style={{
          backgroundImage: `repeating-linear-gradient(
              -45deg,
              #aaa 0px,
              #aaa 5px,
              #eee 5px,
              #eee 10px
            )`,
          left: "50%",
          top: "calc(100% - 300px - 48px)",
        }}
      />
    </Portal>
  );
}

function useWaitFor<T>(
  callback: () => Maybe<T>,

  opts = {
    interval: 100,
    limit: 100,
  },
) {
  const [counter, setCounter] = useState(0);
  const callback$ = useEffectEvent(callback);

  const [$value, setValue] = useState<Maybe<T>>(None);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const result = callback$();
    if (result.isSome) {
      setValue(result);
    } else {
      if (counter < opts.limit) {
        timeout = setTimeout(
          () => setCounter((prev) => prev + 1),
          opts.interval,
        );
      }
    }

    // cancel the timeout
    return () => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    };
  }, [counter, opts.interval, opts.limit]);

  return $value;
}
