import { clamp, onDragReact } from "@liqvid/utils";
import { useEffect, useMemo, useRef, useState } from "react";

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export interface UseResizableOptions {
  /** Whether to maintain aspect ratio when resizing */
  aspectRatio?: boolean;

  /** Initial height in pixels */
  initialHeight?: number;

  /** Initial width in pixels */
  initialWidth?: number;

  /** Maximum height in pixels */
  maxHeight?: number;

  /** Maximum width in pixels */
  maxWidth?: number;

  /** Minimum height in pixels */
  minHeight?: number;

  /** Minimum width in pixels */
  minWidth?: number;
}

export interface UseResizableResult {
  /** Props to spread on corner resize handles */
  getHandleProps: (corner: ResizeCorner) => {
    "data-affords": "click";
    "data-resize-handle": ResizeCorner;
    onMouseDown: React.MouseEventHandler;
    onTouchStart: React.TouchEventHandler;
    style: React.CSSProperties;
  };

  /** Current height */
  height: number;
  /** Current width */
  width: number;
}

const HANDLE_SIZE = 12;

const handleStyles: Record<ResizeCorner, React.CSSProperties> = {
  ne: {
    cursor: "nesw-resize",
    position: "absolute",
    right: -HANDLE_SIZE / 2,
    top: -HANDLE_SIZE / 2,
  },
  nw: {
    cursor: "nwse-resize",
    left: -HANDLE_SIZE / 2,
    position: "absolute",
    top: -HANDLE_SIZE / 2,
  },
  se: {
    bottom: -HANDLE_SIZE / 2,
    cursor: "nwse-resize",
    position: "absolute",
    right: -HANDLE_SIZE / 2,
  },
  sw: {
    bottom: -HANDLE_SIZE / 2,
    cursor: "nesw-resize",
    left: -HANDLE_SIZE / 2,
    position: "absolute",
  },
};

export function useResizable<T extends HTMLElement | SVGElement>(
  ref: React.RefObject<T | null>,
  options: UseResizableOptions = {},
): UseResizableResult {
  const {
    minWidth = 100,
    minHeight = 75,
    maxWidth = Infinity,
    maxHeight = Infinity,
    initialWidth,
    initialHeight,
    aspectRatio = false,
  } = options;

  const [size, setSize] = useState<{ height: number; width: number } | null>(
    initialWidth !== undefined && initialHeight !== undefined
      ? { height: initialHeight, width: initialWidth }
      : null,
  );
  const startSize = useRef({ height: 0, width: 0 });
  const startPos = useRef({ left: 0, top: 0 });
  const initialAspectRatio = useRef(
    initialWidth && initialHeight ? initialWidth / initialHeight : 1,
  );

  // Infer initial dimensions from element if not specified
  useEffect(() => {
    if (size !== null) return;
    const target = ref.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    setSize({ height: rect.height, width: rect.width });
    initialAspectRatio.current = rect.width / rect.height;
  }, [ref, size]);

  /** Fix Portal events */
  const activeCorner = useRef<ResizeCorner | null>(null);

  const getHandleProps = useMemo(() => {
    return (corner: ResizeCorner) => {
      const events = onDragReact(
        (_e, hit) => {
          const target = ref.current;
          if (!target) return;
          if (activeCorner.current !== corner) return;

          let newWidth = startSize.current.width;
          let newHeight = startSize.current.height;
          let newLeft = startPos.current.left;
          let newTop = startPos.current.top;

          // Calculate size changes based on corner
          switch (corner) {
            case "se":
              newWidth = startSize.current.width + hit.x;
              newHeight = startSize.current.height + hit.y;
              break;
            case "sw":
              newWidth = startSize.current.width - hit.x;
              newHeight = startSize.current.height + hit.y;
              newLeft = startPos.current.left + hit.x;
              break;
            case "ne":
              newWidth = startSize.current.width + hit.x;
              newHeight = startSize.current.height - hit.y;
              newTop = startPos.current.top + hit.y;
              break;
            case "nw":
              newWidth = startSize.current.width - hit.x;
              newHeight = startSize.current.height - hit.y;
              newLeft = startPos.current.left + hit.x;
              newTop = startPos.current.top + hit.y;
              break;
          }

          // Maintain aspect ratio if enabled
          if (aspectRatio) {
            const ratio = initialAspectRatio.current;
            // Use the dimension that changed more to determine the other
            const widthDelta = Math.abs(newWidth - startSize.current.width);
            const heightDelta = Math.abs(newHeight - startSize.current.height);

            if (widthDelta >= heightDelta) {
              newHeight = newWidth / ratio;
            } else {
              newWidth = newHeight * ratio;
            }
          }

          // Apply constraints
          newWidth = clamp(minWidth, newWidth, maxWidth);
          newHeight = clamp(minHeight, newHeight, maxHeight);

          // Recalculate position for constrained size (for nw/sw/ne corners)
          if (corner === "nw" || corner === "sw") {
            newLeft =
              startPos.current.left + startSize.current.width - newWidth;
          }
          if (corner === "nw" || corner === "ne") {
            newTop =
              startPos.current.top + startSize.current.height - newHeight;
          }

          setSize({ height: newHeight, width: newWidth });

          Object.assign(target.style, {
            height: `${newHeight}px`,
            left: `${newLeft}px`,
            top: `${newTop}px`,
            width: `${newWidth}px`,
          });
        },
        (e) => {
          const target = ref.current;
          if (!target) return;
          if (!e.target) return;

          // Check if the event target is a resize handle (has cursor style)
          const eventTarget = e.target as HTMLElement;
          if (!eventTarget.style?.cursor?.includes("resize")) {
            activeCorner.current = null;
            return;
          }

          activeCorner.current = corner;

          const rect = target.getBoundingClientRect();
          startSize.current = { height: rect.height, width: rect.width };
          startPos.current = { left: rect.left, top: rect.top };
          initialAspectRatio.current = rect.width / rect.height;
        },
        () => {
          activeCorner.current = null;
        },
      );

      return {
        ...events,
        "data-resize-handle": corner,
        style: {
          ...handleStyles[corner],
          height: HANDLE_SIZE,
          width: HANDLE_SIZE,
        },
      };
    };
  }, [ref, minWidth, minHeight, maxWidth, maxHeight, aspectRatio]);

  return {
    getHandleProps,
    height: size?.height ?? 0,
    width: size?.width ?? 0,
  };
}
