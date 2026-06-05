import { onDragReact } from "@liqvid/utils";
import { useMemo, useRef } from "react";

export function useDraggable<T extends HTMLElement | SVGElement>(
  ref: React.RefObject<T | null>,
) {
  const delta = useRef({ x: 0, y: 0 });

  /** Fix Portal events */
  const active = useRef(false);

  const events = useMemo(
    () =>
      onDragReact(
        (_e, hit) => {
          const target = ref.current;
          if (!target) return;

          if (!active.current) return;

          Object.assign(target.style, {
            left: delta.current.x + hit.x + "px",
            position: "fixed",
            top: delta.current.y + hit.y + "px",
          });
        },
        (e, hit) => {
          const target = ref.current;
          if (!target) return;

          if (!e.target) return;

          // Don't start drag if clicking on a resize handle
          const eventTarget = e.target as HTMLElement;
          if (eventTarget.dataset?.resizeHandle) {
            active.current = false;
            return;
          }

          active.current = target.contains(e.target as Node);

          const rect = target.getBoundingClientRect();
          delta.current = {
            x: rect.left - hit.x,
            y: rect.top - hit.y,
          };
        },
        () => {
          active.current = false;
        },
      ),
    [ref],
  );

  return events;
}
