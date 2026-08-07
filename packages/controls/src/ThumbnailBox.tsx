import { useColorScheme } from "@liqvid/color-scheme/react";
import type { DurationLike } from "@liqvid/duration";
import { usePlayback } from "@liqvid/playback/react";
import { formatTime, useFirstRender } from "@liqvid/utils";
import { useEffect } from "react";

export interface ThumbData {
  /**
   * Number of columns per thumbnail sheet.
   * @default 5
   */
  cols?: number;

  /**
   * How many seconds between thumbnails.
   * @default 4
   */
  frequency?: number;

  /**
   * Height of individual thumbnails.
   * @default 100
   */
  height?: number;

  /** Points of interest in the video to highlight. */
  highlights?: VideoHighlight[];

  /**
   * URL pattern for thumbnails. Must include "%s" for the index of the image.
   * Can also include "%c" for the color scheme.
   */
  path: string;

  /**
   * Number of rows per thumbnail sheet.
   * @default 5
   */
  rows?: number;

  /**
   * Width of individual thumbnails.
   * @default 160
   */
  width?: number;
}

export interface ThumbnailBoxProps extends Omit<ThumbData, "highlights"> {
  progress: number;
  show: boolean;
  title?: string;
}

export interface VideoHighlight {
  time: DurationLike;
  title: string;
}

export function ThumbnailBox({
  cols = 5,
  rows = 5,
  frequency = 4,
  path,
  progress,
  show,
  title,
  height = 100,
  width = 160,
}: ThumbnailBoxProps) {
  const { duration } = usePlayback();
  const { colorScheme } = useColorScheme();

  const count = cols * rows;

  useEffect(() => {
    // preload thumbs (once more important loading has taken place)
    const maxSlide = Math.floor(duration / frequency),
      maxSheet = Math.floor(maxSlide / count);

    for (let sheetNum = 0; sheetNum <= maxSheet; ++sheetNum) {
      const img = new Image();
      img.src = path
        .replace("%s", sheetNum.toString())
        .replace("%c", colorScheme);
    }
  }, [count, frequency, path, duration, colorScheme]);

  const time = progress * duration;

  const markerNum = Math.floor(time / frequency);
  const sheetNum = Math.floor(markerNum / count);
  const markerNumOnSheet = markerNum % count;

  const row = Math.floor(markerNumOnSheet / rows);
  const col = markerNumOnSheet % rows;

  const sheetName = path
    .replace("%s", sheetNum.toString())
    .replace("%c", colorScheme);

  // easy way to prevent hydration errors
  const isFirstRender = useFirstRender();
  if (isFirstRender) return null;

  return (
    <div
      className="lv-controls-thumbnail"
      style={{
        display: show ? "block" : "none",
        left: `${progress * 100}%`,
      }}
    >
      {title && <span className="lv-thumbnail-title">{title}</span>}
      <div className="lv-thumbnail-box">
        <img
          alt=""
          src={sheetName}
          style={{
            left: `-${col * width}px`,
            maxWidth: "unset",
            top: `-${row * height}px`,
          }}
        />
        <span className="lv-thumbnail-time">{formatTime(time * 1000)}</span>
      </div>
    </div>
  );
}
