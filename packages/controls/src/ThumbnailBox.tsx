import { useColorScheme } from "@liqvid/color-scheme/react";
import type { Duration, DurationLike } from "@liqvid/duration";
import { usePlayback } from "@liqvid/playback/react";
import { useFirstRender } from "@liqvid/utils";
import { useEffect } from "react";

export type ThumbData = {
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
   * @default 90
   */
  height?: number;

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
};

export type ThumbnailProps = {
  col: number;
  height: number;
  progress: number;
  row: number;
  show: boolean;
  src: string;
  time: Duration;
  width: number;

  title?: string;
};

export type ThumbnailBoxProps = Omit<ThumbnailProps, "src"> & {
  cols: number;

  /** Points of interest in the video to highlight. */
  highlights?: readonly VideoHighlight[];

  /**
   * Thumbnails will not preload until this promise resolves.
   * (By default, they preload on mount).
   */
  defer?: Promise<void>;

  /** number of seconds between thumbnails */
  frequency: number;
  path: string;
  rows: number;
  render: (props: ThumbnailProps) => React.ReactNode;
};

export type RelativeOffset<M extends string = string> = {
  marker: M;
  offset: DurationLike;
};

export type VideoHighlight<M extends string = string> = {
  time: DurationLike | RelativeOffset<M>;
  title: string;
};

export function ThumbnailBox({
  cols = 5,
  defer,
  rows = 5,
  frequency = 4,
  path,
  progress,
  show,
  title,
  height = 90,
  width = 160,
  render,
}: ThumbnailBoxProps) {
  const { duration, duration$ } = usePlayback();
  const { colorScheme } = useColorScheme();

  const count = cols * rows;

  useEffect(() => {
    const preload = () => {
      // preload thumbs (once more important loading has taken place)
      const maxSlide = Math.floor(duration / frequency),
        maxSheet = Math.floor(maxSlide / count);

      for (let sheetNum = 0; sheetNum <= maxSheet; ++sheetNum) {
        const img = new Image();
        img.src = path
          .replace("%s", sheetNum.toString())
          .replace("%c", colorScheme);
      }
    };

    if (defer) {
      defer.then(preload);
    } else {
      preload();
    }
  }, [count, defer, frequency, path, duration, colorScheme]);

  const time = duration$.times(progress);

  const markerNum = Math.floor(time.inSeconds() / frequency);
  const sheetNum = Math.floor(markerNum / count);
  const markerNumOnSheet = markerNum % count;

  const row = Math.floor(markerNumOnSheet / rows);
  const col = markerNumOnSheet % rows;

  const src = path
    .replace("%s", sheetNum.toString())
    .replace("%c", colorScheme);

  // easy way to prevent hydration errors
  const isFirstRender = useFirstRender();
  if (isFirstRender) return null;

  return render({
    col,
    height,
    progress,
    row,
    show,
    src,
    time,
    title,
    width,
  });
}
