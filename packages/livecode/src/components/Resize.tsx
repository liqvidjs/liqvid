import { clamp, onDragReact } from "@liqvid/utils";
import clsx from "clsx";
import { type JSX, useMemo, useRef } from "react";

/**
 * Component for adjusting the vertical editor/console split.
 */
export function Resize({
  className,
  draggingClass,
  dir = "ew",
  max = 0.75,
  min = 0.25,
  size,
  style: propsStyle = {},
  variable,
  ...props
}: React.ComponentProps<"div"> & {
  draggingClass?: string;

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

  style?: React.CSSProperties;

  size?: React.CSSProperties["height"] & React.CSSProperties["width"];

  variable: string;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  /* event handlers */
  const resizeEvents = useMemo(() => {
    let container: HTMLDivElement | null = null;

    return onDragReact(
      (_e, { x, y }) => {
        if (!container) return;

        const rect = container.getBoundingClientRect();

        if (dir === "ew") {
          const split = clamp(min, (x - rect.left) / rect.width, max) * 100;
          container.style.setProperty(variable, `${split}%`);
        } else if (dir === "ns") {
          const split = clamp(min, (y - rect.top) / rect.height, max) * 100;
          container.style.setProperty(variable, `${split}%`);
        }
      },
      () => {
        container = ref.current?.closest(".lqv-livecode") ?? null;

        if (draggingClass) {
          container?.classList.add(draggingClass);
        }
      },
      () => {
        if (draggingClass) {
          container?.classList.remove(draggingClass);
        }
      },
    );
  }, [dir, max, min, variable, draggingClass]);

  const style: React.CSSProperties = {
    position: "absolute",
  };
  if (dir === "ew") {
    Object.assign(style, {
      left: `var(${variable})`,
      width: size,
    });
  }
  if (dir === "ns") {
    Object.assign(style, {
      height: size,
      top: `var(${variable})`,
    });
  }
  Object.assign(style, propsStyle);

  return (
    <div
      className={clsx(`lqv-livecode-resize`, className)}
      data-dir={dir}
      ref={ref}
      style={style}
      {...resizeEvents}
      {...props}
    />
  );
}
