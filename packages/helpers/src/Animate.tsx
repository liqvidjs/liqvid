import { Duration, type DurationLike } from "@liqvid/duration";
import { usePlayback } from "@liqvid/playback/react";
import { useScriptOptional } from "@liqvid/script/react";
import { omit, useFirstRender } from "@liqvid/utils";
import { Slot } from "@radix-ui/react-slot";

export function Animate<M extends string>({
  at = 0,
  children,
  delay = 0,
  duration,
  easing,
  fill,
  keyframes,
  style,
  ...props
}: {
  at?: M | DurationLike | number;
  children?: React.ReactNode;
  delay?: DurationLike | number;
  easing?: string | undefined;
  duration: DurationLike;
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  fill?: FillMode;
} & React.HTMLAttributes<HTMLElement>) {
  const playback = usePlayback();
  const script = useScriptOptional();

  if (typeof at === "string") {
    if (!script) {
      throw new Error();
    }

    const marker = script.markers.get(at);

    if (!marker) {
      throw new Error(`could not find marker ${at}`);
    }

    at = marker.start;
  }

  if (typeof at === "object") {
    at = Duration.inMilliseconds(at);
  }

  delay = typeof delay === "number" ? delay : Duration.inMilliseconds(delay);

  const isFirstRender = useFirstRender();

  const initialStyles = isFirstRender ? getInitialStyles(keyframes) : {};

  return (
    <Slot
      style={{ ...initialStyles, ...style }}
      {...props}
      ref={
        playback.newAnimation(keyframes, {
          delay: at + delay,
          duration:
            typeof duration === "number"
              ? duration
              : Duration.inMilliseconds(duration),
          easing,
          fill,
          // biome-ignore lint/suspicious/noExplicitAny: Radix types don't accept SVG
        }) as any
      }
    >
      {children}
    </Slot>
  );
}

const excludeKeys = new Set(["composite", "easing", "offset"]);

/** Extract initial styles from PropertyIndexedKeyframes */
function getInitialStyles(
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
): React.CSSProperties {
  if (Array.isArray(keyframes)) {
    return omit(keyframes[0], ["composite", "easing", "offset"]);
  }

  const styles: Record<string, string | number> = {};

  for (const key of Object.keys(keyframes)) {
    if (excludeKeys.has(key)) continue;

    const value = keyframes[key as keyof PropertyIndexedKeyframes];
    if (value === undefined || value === null) continue;

    // Get the first value (either from array or single value)
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (
      firstValue !== undefined &&
      firstValue !== null &&
      typeof firstValue !== "object"
    ) {
      styles[key] = firstValue;
    }
  }

  return styles;
}
