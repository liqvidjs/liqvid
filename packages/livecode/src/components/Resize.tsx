import { clamp } from "@liqvid/utils/misc";
import { onDrag } from "@liqvid/utils/react";
import { useMemo, useRef } from "react";

/**
 * Component for adjusting the vertical editor/console split.
 */
export function Resize({
  dir = "ew",
  max = 0.75,
  min = 0.25,
}: {
  /**
   * Resize direction, east-west or north-south.
   * @default "ew"
   */
  dir?: "ew" | "ns";

  /**
   * Maximum value.
   * @default 0.75
   */
  max?: number;

  /**
   * Minimum value.
   * @default 0.25
   */
  min?: number;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>();

  /* event handlers */
  const resizeEvents = useMemo(() => {
    let container: HTMLDivElement;
    return onDrag(
      (_e, { x, y }) => {
        const rect = container.getBoundingClientRect();

        if (dir === "ew") {
          const split = clamp(min, (x - rect.left) / rect.width, max) * 100;
          container.style.setProperty("--split", `${split}%`);
        } else if (dir === "ns") {
          const split = clamp(min, (rect.bottom - y) / rect.height, max) * 100;
          container.style.setProperty("--v-split", `${split}%`);
        }
      },
      () => {
        container = ref.current.closest(".lqv-codebooth") as HTMLDivElement;
        container.classList.add("dragging");
      },
      () => {
        container.classList.remove("dragging");
      },
    );
  }, [dir, max, min]);

  return (
    <div
      {...resizeEvents}
      className={`ui-resizable-handle ui-resizable-${dir}`}
      ref={ref}
    />
  );
}
