import {useEditor} from "@tldraw/tldraw";
import {useEffect, useMemo, useRef} from "react";
import {layerCanvas} from "../layers";

/**
 * Manage the viewport transform of the assets layer.
 */
export function CanvasLayer({children}: {children: React.ReactNode}) {
  const editor = useEditor();
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      editor.store.listen(({changes}) => {
        const layer = layerRef.current;
        if (!layer) return;

        // look for camera records
        for (const key of Object.keys(
          changes.updated,
        ) as (keyof typeof changes.updated)[]) {
          const record = changes.updated[key][1];
          if (record.typeName !== "camera") continue;

          // update transform
          const {x, y, z: _z} = record;
          const zoom = editor.getZoomLevel();
          layer.style.transform = `translate(${x * zoom}px, ${y * zoom}px)`;
        }
      }),
    [editor, editor.store],
  );

  // render
  const style = useMemo(
    () =>
      ({
        left: "0",
        top: "0",
        position: "absolute",
        zIndex: layerCanvas,
      }) as const,
    [],
  );

  return (
    <div ref={layerRef} style={style}>
      {children}
    </div>
  );
}
