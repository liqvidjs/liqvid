import { usePlayback } from "@liqvid/playback/react";
import clsx from "clsx";
import { useCallback } from "react";

import { ignoreCanvasClickSymbol } from "./symbols.ts";
import { isInteractiveElement } from "./utils.ts";

/**
 * Player canvas where all the content goes.
 */
export function Canvas({
  className,
  children,
  pauseOnClick = false,
  ...props
}: {
  /**
   * Whether to play/pause the video when the canvas is clicked
   * (default behavior for "regular" videos).
   *
   * This behavior can be pre-empted by adding `data-affords="click"`
   * on the click target, or by setting `e[ignoreCanvasClickSymbol] = true`,
   * where `e` is the native event.
   */
  pauseOnClick?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const playback = usePlayback();

  const canvasClickHandler = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pauseOnClick) {
        return;
      }

      // ignore clicks on input tags
      if (e.target instanceof Element && isInteractiveElement(e.target)) {
        return;
      }

      // data-affords markup
      if (
        e.target instanceof Element &&
        e.target.closest(`*[data-affords~="click"]`)
      ) {
        return;
      }

      // the reason for this escape hatch is that this gets called in between an element's onMouseUp
      // listener and the listener added by dragHelper, so you can't call stopPropagation() in the
      // onMouseUp or else the dragging won't release.
      // biome-ignore lint/suspicious/noExplicitAny: symbol
      if ((e.nativeEvent as any)[ignoreCanvasClickSymbol]) return;

      if (playback.paused) {
        playback.play();
      } else {
        playback.pause();
      }

      // this.emit("canvasClick");
    },
    [playback, pauseOnClick],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: we are imitating standard video behavior here
    <div
      className={clsx("lv-canvas", className)}
      onMouseUp={canvasClickHandler}
      {...props}
    >
      {children}
    </div>
  );
}
