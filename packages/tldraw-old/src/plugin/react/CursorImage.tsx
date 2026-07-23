import {useEditor} from "@tldraw/editor";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {PointerHandler} from "..";
import {getCursorSvgs} from "../utils";
import {PointerState} from "../types";

/**
 * Image of a cursor type.
 */
export const CursorImage = forwardRef<
  {handlePointer: PointerHandler},
  JSX.IntrinsicElements["div"]
>(function CursorImage(_, ref) {
  const editor = useEditor();

  /** Cursors map */
  const cursors = useMemo(getCursorSvgs, []);
  // console.log([...cursors.keys()])

  /** Ref for the <div> element */
  const cursorRef = useRef<HTMLDivElement>(null);

  // handler
  const handlePointer: PointerHandler = useCallback(
    (opts) => {
      const cursor = cursorRef.current;
      if (!cursor) return;

      // update image
      if (opts.tool) {
        // console.log(cursors.)
        return;
        const info = cursors.get(opts.tool) ?? "cross";
        if (!info) return;
        cursor.style.backgroundImage = info.image;
      }

      // update coordinates
      if (opts.x !== undefined && opts.y !== undefined) {
        const {x, y} = opts;
        const zoom = editor.getZoomLevel();
        cursorRef.current.style.willChange = "transform";
        cursorRef.current.style.transform = `translate(${x * zoom - 16}px, ${
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

  return <div ref={cursorRef} style={style} />;
});
