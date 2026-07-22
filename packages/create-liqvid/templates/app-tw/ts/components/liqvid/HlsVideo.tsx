import {
  type GreenScreenConfig,
  useGreenScreen,
} from "@liqvid/media/greenscreen";
import clsx from "clsx";
import Hls from "hls.js";
import { Video } from "liqvid";
import { useEffect, useRef, useState } from "react";

export interface HlsVideoProps {
  className?: string;

  children?: React.ReactNode;

  draggable?: boolean;

  filename?: string;

  hls?: string;

  /** Enable greenscreen effect (turns specified color pixels transparent) */
  greenscreen?: boolean | GreenScreenConfig;
}

export function HlsVideo({
  className,
  greenscreen = false,
  hls,
  ...props
}: HlsVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [video, ref] = useState<HTMLVideoElement | null>(null);

  useGreenScreen({
    canvasRef,
    color: typeof greenscreen === "object" ? greenscreen.color : undefined,
    enabled: typeof greenscreen === "boolean" ? greenscreen : true,
    tolerance:
      typeof greenscreen === "object" ? greenscreen.tolerance : undefined,
    video,
  });

  /* HLS */
  useEffect(() => {
    if (!hls) return;
    if (!video) return;

    if (Hls.isSupported()) {
      const hlsStream = new Hls();
      hlsStream.loadSource(hls);
      hlsStream.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hls;
    }
  }, [hls, video]);

  const cls = clsx(
    "draggable in-[.settings-open]:mr-48 in-[.speed-open]:mb-26 in-[.no-face]:hidden transition-[margin] duration-300 ease-in-out",
    className,
  );

  if (greenscreen) {
    return (
      <div className={cls}>
        <Video className="invisible absolute" ref={ref}>
          {props.children}
        </Video>
        <canvas className="h-full w-auto" ref={canvasRef} />
      </div>
    );
  }

  return (
    <Video className={cls} ref={ref}>
      {props.children}
    </Video>
  );
}
