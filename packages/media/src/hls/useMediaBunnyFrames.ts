import { Duration, type DurationLike } from "@liqvid/duration";
import {
  useBufferedItem,
  usePlayback,
  usePlaybackEvent,
  useReadyStateItem,
} from "@liqvid/playback/react";
import { useStableDuration } from "@liqvid/utils";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";

import { createFrameHost } from "./frame-host.ts";
import { type FrameRenderer, ReadyState } from "./frame-session.ts";
import { type GreenScreenConfig, resolveGreenScreen } from "./greenscreen.ts";

export function useMediaBunnyFrames({
  canvasRef,
  enabled,
  greenscreen,
  source,
  start,
  preload,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  greenscreen: boolean | GreenScreenConfig;
  source?: string;
  start?: DurationLike;
  /** Seconds, or a duration. */
  preload?: number | DurationLike;
}): void {
  const playback = usePlayback();
  const { setBuffered } = useBufferedItem(enabled);
  const { setReadyState } = useReadyStateItem();
  const start$ = useStableDuration(start ?? {});
  const rendererRef = useRef<FrameRenderer | null>(null);

  const preloadSeconds =
    preload === undefined || typeof preload === "number"
      ? preload
      : Duration.inSeconds(preload);

  // Frames arrive many times per second; only report actual changes.
  const reportedReadyState = useRef<number>(ReadyState.HAVE_ENOUGH_DATA);
  const reportReadyState = useCallback(
    (readyState: number) => {
      if (reportedReadyState.current === readyState) return;
      reportedReadyState.current = readyState;
      setReadyState(readyState);
    },
    [setReadyState],
  );
  const reportBuffered = useCallback(
    (ranges: readonly (readonly [number, number])[]) => {
      const offset = start$.inSeconds();
      setBuffered(
        ranges.map(
          ([rangeStart, rangeEnd]) =>
            [offset + rangeStart, offset + rangeEnd] as const,
        ),
      );
    },
    [setBuffered, start$],
  );

  // Depend on the resolved values so an inline config object doesn't restart
  // decoding on every render.
  const keying = resolveGreenScreen(greenscreen);
  const keyColor = keying?.color;
  const keyTolerance = keying?.tolerance;

  const isPlaying = () => !playback.paused && !playback.seeking;
  const mediaTime$ = useEffectEvent(() =>
    playback.currentTime$.minus(start$).inSeconds(),
  );
  const renderAtPlaybackTime$ = useEffectEvent(() => {
    if (playback.paused && !playback.seeking) return;
    rendererRef.current?.render(mediaTime$());
  });
  const seekAtPlaybackTime$ = useEffectEvent(() => {
    rendererRef.current?.seek(mediaTime$(), isPlaying());
  });
  const renderAfterSeek$ = useEffectEvent(() => {
    if (playback.seeking) return;
    rendererRef.current?.seek(mediaTime$(), isPlaying());
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!source || !enabled || !canvas) return;

    reportReadyState(ReadyState.HAVE_NOTHING);
    const renderer = createFrameHost({
      canvas,
      greenscreen:
        keyColor === undefined || keyTolerance === undefined
          ? null
          : { color: keyColor, tolerance: keyTolerance },
      initialTimestamp: playback.currentTime$.minus(start$).inSeconds(),
      onBuffered: reportBuffered,
      onError(message, error) {
        reportReadyState(ReadyState.HAVE_ENOUGH_DATA);
        console.error(`${message} with MediaBunny`, error);
      },
      onReadyState: reportReadyState,
      preloadSeconds,
      source: new URL(source, document.baseURI).href,
    });
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      reportBuffered([]);
      reportReadyState(ReadyState.HAVE_ENOUGH_DATA);
    };
  }, [
    canvasRef,
    enabled,
    keyColor,
    keyTolerance,
    playback,
    preloadSeconds,
    reportBuffered,
    reportReadyState,
    source,
    start$,
  ]);

  useFramePlaybackEvents(
    enabled,
    playback,
    renderAtPlaybackTime$,
    seekAtPlaybackTime$,
    renderAfterSeek$,
    reportReadyState,
  );
}

function useFramePlaybackEvents(
  enabled: boolean,
  playback: ReturnType<typeof usePlayback>,
  onTimeChange: () => void,
  onSeekDuringScrub: () => void,
  onSeeked: () => void,
  setReadyState: (readyState: number) => void,
): void {
  // currentTime assignment emits seeking without setting playback.seeking.
  const programmaticSeek = useRef(false);

  usePlaybackEvent("timeupdate", () => {
    // Scrub moves and keyboard seeks must jump. Sequential render walks every
    // frame between the old and new time, including after the pointer is released.
    if (playback.seeking || programmaticSeek.current) {
      programmaticSeek.current = false;
      onSeekDuringScrub();
      return;
    }

    onTimeChange();
  });
  usePlaybackEvent("seeked", () => {
    programmaticSeek.current = false;
    if (playback.seeking) return;
    onSeeked();
  });
  usePlaybackEvent("seeking", () => {
    if (!playback.seeking) programmaticSeek.current = true;
    if (!enabled) return;
    setReadyState(ReadyState.HAVE_METADATA);
  });
}
