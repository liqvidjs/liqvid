import { Duration, type DurationLike } from "@liqvid/duration";
import { usePlayback } from "@liqvid/playback/react";
import { useScriptOptional } from "@liqvid/script/react";
import { Slot } from "@radix-ui/react-slot";

export function Animate<M extends string>({
  at = 0,
  children,
  delay = 0,
  duration,
  easing,
  fill,
  keyframes,
  ...props
}: {
  at?: M | DurationLike | number;
  children?: React.ReactNode;
  delay?: DurationLike | number;
  easing?: string | undefined;
  duration: DurationLike;
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  fill?: FillMode;
}) {
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
    at = Duration.from(at).inMilliseconds();
  }

  delay =
    typeof delay === "number" ? delay : Duration.from(delay).inMilliseconds();

  return (
    <Slot
      {...props}
      ref={
        playback.newAnimation(keyframes, {
          delay: at + delay,
          duration:
            typeof duration === "number"
              ? duration
              : Duration.from(duration).inMilliseconds(),
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
