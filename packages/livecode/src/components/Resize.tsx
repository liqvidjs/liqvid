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
  dir?: "ew" | "ns" | "sn" | "we";

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

        let split: number;
        switch (dir) {
          case "ew":
            split = clamp(min, (x - rect.left) / rect.width, max) * 100;
            break;
          case "we":
            split = clamp(min, (rect.left - x) / rect.width, max) * 100;
            break;
          case "ns":
            split = clamp(min, (y - rect.top) / rect.height, max) * 100;
            break;
          case "sn":
            split = clamp(min, (rect.bottom - y) / rect.height, max) * 100;
            break;
        }

        container.style.setProperty(variable, `${split}%`);
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

  switch (dir) {
    case "ew":
      Object.assign(style, {
        left: `var(${variable})`,
        width: size,
      });
      break;

    case "we":
      Object.assign(style, {
        right: `var(${variable})`,
        width: size,
      });
      break;
    case "ns":
      Object.assign(style, {
        height: size,
        top: `var(${variable})`,
      });
      break;

    case "sn":
      Object.assign(style, {
        bottom: `var(${variable})`,
        height: size,
      });
      break;
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
