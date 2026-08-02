import { useSeekable } from "@lqv/playback/react";
import { useEffect, useRef } from "react";

import { cursorReplay } from "./index.ts";

type CursorData = Parameters<typeof cursorReplay>[0]["data"];

/**
 * Move an image along a recorder cursor path. React version of {@link cursorReplay}.
 */
export function Cursor({
  align,
  data,
  start,
  end,
  ...props
}: Omit<Parameters<typeof cursorReplay>[0], "data" | "playback" | "target"> & {
  /** Cursor data to replay. */
  data: CursorData | Promise<CursorData>;

  /** Src of cursor image. */
  src: string;
} & React.ComponentProps<"img">) {
  const playback = useSeekable();
  const ref = useRef<HTMLImageElement>(null);

  // subscribe
  useEffect(() => {
    if (data instanceof Promise) {
      let unsub: () => void;

      data.then((data) => {
        if (!ref.current) return;

        unsub = cursorReplay({
          align,
          data,
          end,
          playback,
          start,
          target: ref.current,
        });
      });

      return () => {
        unsub?.();
      };
    }

    if (!ref.current) return;

    return cursorReplay({
      align,
      data,
      end,
      playback,
      start,
      target: ref.current,
    });
  }, [align, data, playback, end, start]);

  // biome-ignore lint/a11y/useAltText: provided by consumer
  return <img ref={ref} {...props} />;
}
