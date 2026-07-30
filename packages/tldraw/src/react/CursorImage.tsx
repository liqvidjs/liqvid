import { useEditor } from "@tldraw/editor";
import { useCallback, useImperativeHandle, useMemo, useRef } from "react";

import type { PointerHandler } from "../index.ts";
import { getCursorSvgs } from "../utils.ts";

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
        const { x, y } = opts;
        const zoom = editor.getZoomLevel();
        cursor.style.willChange = "transform";
        cursor.style.transform = `translate(${x * zoom - 16}px, ${
          y * zoom - 16
        }px)`;
      }
    },
    [cursors, editor],
  );

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
