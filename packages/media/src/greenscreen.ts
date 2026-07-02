import { useEventListener } from "@liqvid/event-emitter/react";
import { isChrome } from "@liqvid/utils";
import { useEffect, useEffectEvent, useRef } from "react";

export type HexColor = `#${string}`;

export type GreenScreenConfig = {
  /** Greenscreen color in hex format (default "#00FF00") */
  color?: HexColor;

  /** Tolerance for greenscreen color matching (0-255, default 50) */
  tolerance?: number;
};

/** Apply greenscreen effect to a `<video>` */
export function useGreenScreen({
  canvasRef,
  color = "#00FF00",
  enabled = false,
  // Chrome does weird things to colors
  tolerance = isChrome ? 60 : 50,
  video,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  video: HTMLVideoElement | null;
} & GreenScreenConfig) {
  const keyColor = parseHexColor(color);

  const animationFrameRef = useRef<number>(null);

  const startProcessing = () => {
    animationFrameRef.current = requestAnimationFrame(processGreenscreen);
  };
  const startProcessing$ = useEffectEvent(startProcessing);

  const stopProcessing = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
  const stopProcessing$ = useEffectEvent(stopProcessing);

  /* greenscreen processing - renders a single frame */
  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", {
      colorSpace: "srgb",
      willReadFrequently: true,
    });
    if (!ctx) return;

    // Match canvas size to video
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Process pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      const dist = supDistance({ b, g, r }, keyColor);

      // Check if pixel is close to the key color
      if (dist <= tolerance) {
        // Make pixel transparent
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };
  const renderFrame$ = useEffectEvent(renderFrame);

  /* greenscreen animation loop - continuously renders while playing */
  const processGreenscreen = useEffectEvent(() => {
    if (!video || video.paused || video.ended) return;

    renderFrame();
    animationFrameRef.current = requestAnimationFrame(processGreenscreen);
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
    };
  }, [enabled, video]);

  useEventListener(video, "play", startProcessing);
  useEventListener(video, "pause", stopProcessing);
  useEventListener(video, "ended", stopProcessing);
  useEventListener(video, "loadeddata", renderFrame);
  useEventListener(video, "seeked", renderFrame);
}

function supDistance(color1: RGB, color2: RGB) {
  return Math.max(
    Math.abs(color1.r - color2.r) / 2,
    Math.abs(color1.g - color2.g),
    Math.abs(color1.b - color2.b) / 2,
  );
}

type RGB = { r: number; g: number; b: number };

/** Parse a hex color string to RGB values */
function parseHexColor(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { b, g, r };
}
