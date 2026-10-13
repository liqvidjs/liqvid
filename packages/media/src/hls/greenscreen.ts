import { useEventListener } from "@liqvid/event-emitter/react";
import { isChrome } from "@liqvid/utils";
import { useEffect, useEffectEvent, useRef } from "react";

import {
  disposeKeyedCanvas,
  type GreenScreenSource,
  type HexColor,
  renderKeyedFrame,
} from "./greenscreen-render.ts";

export type { HexColor };

export type GreenScreenConfig = Readonly<{
  /** Greenscreen color in hex format (default "#00FF00") */
  color?: HexColor;

  /** Tolerance for greenscreen color matching (0-255, default 50) */
  tolerance?: number;
}>;

export type ResolvedGreenScreen = Readonly<{
  color: HexColor;
  tolerance: number;
}>;

const DEFAULT_COLOR: HexColor = "#00FF00";

// Chrome does weird things to colors
const DEFAULT_TOLERANCE = isChrome ? 60 : 50;

/** Fill in greenscreen defaults, or return null when keying is disabled. */
export function resolveGreenScreen(
  greenscreen: boolean | GreenScreenConfig,
): ResolvedGreenScreen | null {
  if (!greenscreen) return null;
  const config = greenscreen === true ? {} : greenscreen;
  return {
    color: config.color ?? DEFAULT_COLOR,
    tolerance: config.tolerance ?? DEFAULT_TOLERANCE,
  };
}

/** Draw a source image and key its pixels on the GPU. */
export function renderGreenScreen({
  canvas,
  color = DEFAULT_COLOR,
  source,
  tolerance = DEFAULT_TOLERANCE,
}: {
  canvas: HTMLCanvasElement;
  color?: HexColor;
  source: GreenScreenSource;
  tolerance?: number;
}): void {
  renderKeyedFrame({ canvas, color, source, tolerance });
}

/** Release WebGL resources associated with a greenscreen canvas. */
export function disposeGreenScreen(canvas: HTMLCanvasElement | null): void {
  disposeKeyedCanvas(canvas);
}

/** Apply greenscreen effect to a `<video>` */
export function useGreenScreen({
  canvasRef,
  color = DEFAULT_COLOR,
  enabled = false,
  tolerance = DEFAULT_TOLERANCE,
  video,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  video: HTMLVideoElement | null;
} & GreenScreenConfig) {
  const animationFrameRef = useRef<number>(null);
  const videoFrameRef = useRef<{
    id: number;
    video: HTMLVideoElement;
  } | null>(null);

  const startProcessing = () => {
    if (video && typeof video.requestVideoFrameCallback === "function") {
      if (videoFrameRef.current !== null) return;
      videoFrameRef.current = {
        id: video.requestVideoFrameCallback(processVideoFrame),
        video,
      };
      return;
    }

    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(processGreenscreen);
  };
  const startProcessing$ = useEffectEvent(startProcessing);

  const stopProcessing = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoFrameRef.current !== null) {
      videoFrameRef.current.video.cancelVideoFrameCallback(
        videoFrameRef.current.id,
      );
      videoFrameRef.current = null;
    }
  };
  const stopProcessing$ = useEffectEvent(stopProcessing);

  /* greenscreen processing - renders a single frame */
  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    renderGreenScreen({
      canvas,
      color,
      source: video,
      tolerance,
    });
  };
  const renderFrame$ = useEffectEvent(renderFrame);

  /* greenscreen animation loop - continuously renders while playing */
  const processGreenscreen = useEffectEvent(() => {
    if (!video || video.paused || video.ended) return;

    renderFrame();
    animationFrameRef.current = requestAnimationFrame(processGreenscreen);
  });
  const processVideoFrame = useEffectEvent(() => {
    const scheduledFrame = videoFrameRef.current;
    videoFrameRef.current = null;
    if (
      !scheduledFrame ||
      scheduledFrame.video !== video ||
      scheduledFrame.video.paused ||
      scheduledFrame.video.ended
    ) {
      return;
    }

    renderFrame();
    videoFrameRef.current = {
      id: scheduledFrame.video.requestVideoFrameCallback(processVideoFrame),
      video: scheduledFrame.video,
    };
  });

  /* greenscreen effect */
  useEffect(() => {
    if (!enabled) return;

    if (!video) return;

    // Start if already playing
    if (!video.paused) {
      startProcessing$();
    }
    // Render first frame if video data already loaded
    else if (video.readyState >= 2) {
      renderFrame$();
    }

    return () => {
      stopProcessing$();
      disposeGreenScreen(canvasRef.current);
    };
  }, [enabled, video]);

  useEventListener(video, "play", startProcessing);
  useEventListener(video, "pause", stopProcessing);
  useEventListener(video, "ended", stopProcessing);
  useEventListener(video, "loadeddata", renderFrame);
  useEventListener(video, "seeked", renderFrame);
}
