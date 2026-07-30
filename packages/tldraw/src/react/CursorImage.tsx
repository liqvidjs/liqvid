import { useEditor, useQuickReactor } from "@tldraw/editor";
import { useCallback, useImperativeHandle, useMemo, useRef } from "react";

import type { PointerHandler } from "../index.ts";
import { getCursorSvgs } from "../utils.ts";

/** Half the cursor image size (32px), used to center it on the point. */
const CURSOR_OFFSET = 16;

/**
 * Image of a cursor type.
 */
export function CursorImage({
  ref,
}: {
  ref?: React.Ref<{ handlePointer: PointerHandler }>;
}): React.ReactNode {
  const editor = useEditor();

  /** Cursors map */
  const cursors = useMemo(getCursorSvgs, []);

  /** Ref for the <div> element */
  const cursorRef = useRef<HTMLDivElement>(null);

  /**
   * The cursor's position in page (tldraw canvas) coordinates. Stored so the
   * screen transform can be recomputed whenever the camera pans or zooms, not
   * only when a new pointer position arrives.
   */
  const pagePoint = useRef<{ x: number; y: number } | null>(null);

  /**
   * Position the cursor from its stored page point.
   *
   * The cursor lives inside {@link CanvasLayer}, whose transform already
   * applies the camera pan (`camera * zoom`). So within that layer a page
   * point `p` sits at local offset `p * zoom`. Multiplying by the current
   * zoom here keeps the cursor pinned to the same canvas point across zoom
   * changes.
   */
  const place = useCallback(() => {
    const cursor = cursorRef.current;
    const point = pagePoint.current;
    if (!cursor || !point) return;

    // Read zoom from the camera (same source as `CanvasLayer`) so the two
    // stay perfectly in sync.
    const zoom = editor.getCamera().z;
    cursor.style.transform = `translate(${
      point.x * zoom - CURSOR_OFFSET
    }px, ${point.y * zoom - CURSOR_OFFSET}px)`;
  }, [editor]);

  // handler
  const handlePointer: PointerHandler = useCallback(
    (opts) => {
      const cursor = cursorRef.current;
      if (!cursor) return;

      // update image
      if ("kind" in opts && opts.kind !== undefined) {
        const info = cursors.get(opts.kind);
        if (!info) return;
        cursor.style.backgroundImage = info.image;
      }

      // update coordinates
      if (opts.x !== undefined && opts.y !== undefined) {
        pagePoint.current = { x: opts.x, y: opts.y };
        cursor.style.willChange = "transform";
        place();
      }
    },
    [cursors, place],
  );

  // Reposition whenever the camera changes (pan or zoom), so the cursor stays
  // pinned to its canvas point instead of drifting on zoom.
  useQuickReactor("sync cursor to camera", () => {
    // establish a reactive dependency on the camera
    editor.getCamera();
    place();
  }, [editor, place]);

  // extend handle
  useImperativeHandle(ref, () => ({
    handlePointer,
  }));

  // render
  const cursor = cursors.get("cross");
  const style = useMemo(
    () => ({
      backgroundImage: cursor?.image,
      height: "32px",
      width: "32px",
    }),
    [cursor?.image],
  );

  return <div id="tl-cursor" ref={cursorRef} style={style} />;
}
