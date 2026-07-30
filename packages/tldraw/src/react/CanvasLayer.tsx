import { useEffect, useMemo, useRef } from "react";
import { useEditor } from "tldraw";

import { layerCanvas } from "../layers.ts";
import { isCamera } from "../record-types.ts";

/**
 * Manage the viewport transform of the assets layer.
 */
export function CanvasLayer({ children }: { children: React.ReactNode }) {
  const editor = useEditor();
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      editor.store.listen(({ changes }) => {
        const layer = layerRef.current;
        if (!layer) return;

        // look for camera records
        for (const key of Object.keys(
          changes.updated,
        ) as (keyof typeof changes.updated)[]) {
          const entry = changes.updated[key];
          if (!entry) continue;
          const record = entry[1];
          if (!isCamera(record)) continue;

          // update transform
          const { x, y } = record;
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
        position: "absolute",
        top: "0",
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
