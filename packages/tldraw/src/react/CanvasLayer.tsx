import { useMemo, useRef } from "react";
import { useEditor, useQuickReactor } from "tldraw";

import { layerCanvas } from "../layers.ts";

/**
 * Manage the viewport transform of the assets layer.
 */
export function CanvasLayer({ children }: { children: React.ReactNode }) {
  const editor = useEditor();
  const layerRef = useRef<HTMLDivElement>(null);

  // Keep the layer's transform in sync with the camera. Using `useQuickReactor`
  // (rather than a raw store listener) means this runs in the same reactive
  // flush as other camera-driven updates — notably the cursor in
  // `CursorImage` — so they never momentarily disagree on the camera during a
  // zoom or pan (which previously made the cursor appear to jump).
  useQuickReactor("sync canvas layer to camera", () => {
    const layer = layerRef.current;
    if (!layer) return;

    const { x, y, z } = editor.getCamera();
    layer.style.transform = `translate(${x * z}px, ${y * z}px)`;
  }, [editor]);

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
