/** biome-ignore-all lint/suspicious/noExplicitAny: variance */

import type { CommonEasingName, EasingFunction } from "@liqvid/animation";
import { bezier, easings } from "@liqvid/animation";
import { Duration, type DurationLike } from "@liqvid/duration";
import { useTime$ } from "@liqvid/playback/react";
import type { Script } from "@liqvid/script";
import { useScriptOptional } from "@liqvid/script/react";
import { clamp, lerp } from "@liqvid/utils";
import { useCallback, useRef } from "react";

type AnyElement = HTMLElement | SVGElement | MathMLElement;

/**
 * Map a DOM element type to its corresponding React attribute props.
 * Distributes over the union of all JSX intrinsic elements to find
 * the one whose underlying DOM type matches `E`.
 */
type PropsFromElement<E extends AnyElement> = {
  [K in keyof React.JSX.IntrinsicElements]: React.JSX.IntrinsicElements[K] extends React.DetailedHTMLProps<
    infer Props,
    E
  >
    ? Props
    : React.JSX.IntrinsicElements[K] extends React.SVGProps<E>
      ? React.JSX.IntrinsicElements[K]
      : never;
}[keyof React.JSX.IntrinsicElements];

/**
 * A single keyframe entry. Contains element-specific attribute values
 * to interpolate, plus timing/easing metadata.
 *
 * Either provide `at` (an absolute time — marker name or DurationLike)
 * or `duration` (time relative to the previous keyframe).
 * The first keyframe in the array may omit both; it defaults to time 0.
 */
type Keyframe$<M extends string, T extends AnyElement> = Partial<
  PropsFromElement<T>
> &
  (
    | { at: M | DurationLike; duration?: undefined }
    | { at?: undefined; duration: DurationLike }
    | { at?: undefined; duration?: undefined }
  ) & {
    /**
     * Easing used to interpolate **from the previous keyframe to this one**.
     * Has no effect on the first keyframe.
     */
    easing?: CommonEasingName | EasingFunction;

    /**
     * Offset added to the resolved `at` time. Only meaningful when `at`
     * is also specified (e.g. a marker name plus an offset).
     */
    offset?: DurationLike;
  };

/** An array of keyframes describing how element attributes change over time. */
export type Keyframes$<M extends string, T extends AnyElement> = ReadonlyArray<
  Keyframe$<M, T>
>;

/** Metadata keys that aren't attribute values to interpolate. */
const metaKeys = new Set(["at", "duration", "easing", "offset"]);

/** Resolve an easing name or function into a numeric easing function. */
function resolveEasing(
  easing: CommonEasingName | EasingFunction | undefined,
): EasingFunction {
  if (!easing) return (x: number) => x;
  if (typeof easing === "function") return easing;
  const points = easings[easing] as readonly [number, number, number, number];
  return bezier(...points);
}

/**
 * A resolved (pre-computed) keyframe with absolute start time in ms and
 * a resolved easing function.
 */
interface ResolvedKeyframe {
  /** Easing function for interpolation from the previous keyframe to this one. */
  easingFn: EasingFunction;
  /** Absolute start time in milliseconds. */
  timeMs: number;
  /** Attribute values at this keyframe (only the interpolatable props). */
  values: Record<string, number | string>;
}

/**
 * Pre-resolve timing, easing, and attribute values for an array of keyframes.
 */
function resolveKeyframes<M extends string, T extends AnyElement>(
  keyframes: Keyframes$<M, T>,
  script: Script<M> | null,
): ResolvedKeyframe[] {
  const resolved: ResolvedKeyframe[] = [];
  let currentTimeMs = 0;

  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i]!;

    // --- resolve time ---
    if (kf.at !== undefined) {
      if (typeof kf.at === "string") {
        // Marker name
        if (!script) {
          throw new Error(
            "keyframes$: marker name used in `at` but no Script is available",
          );
        }
        const marker = script.markers.get(kf.at as M);
        if (!marker) {
          throw new Error(
            `keyframes$: could not find marker "${kf.at as string}"`,
          );
        }
        currentTimeMs = marker.start.inMilliseconds();
      } else {
        // DurationLike
        currentTimeMs = Duration.inMilliseconds(kf.at);
      }

      // Apply offset (only meaningful with `at`)
      if (kf.offset !== undefined) {
        currentTimeMs += Duration.inMilliseconds(kf.offset);
      }
    } else if (kf.duration !== undefined) {
      currentTimeMs += Duration.inMilliseconds(kf.duration);
    }
    // else: first keyframe at currentTimeMs (0), or subsequent ones stick at current time

    // --- resolve easing ---
    const easingFn = resolveEasing(kf.easing);

    // --- collect attribute values ---
    const values: Record<string, number | string> = {};
    for (const [key, val] of Object.entries(kf)) {
      if (metaKeys.has(key)) continue;
      if (val === undefined || val === null) continue;
      values[key] = val as number | string;
    }

    resolved.push({ easingFn, timeMs: currentTimeMs, values });
  }

  return resolved;
}

/**
 * Apply resolved keyframes to a DOM element at time `tMs`.
 *
 * For each attribute that appears in the keyframes:
 * - Find the surrounding pair of keyframes that bracket `tMs`
 * - If both values are numbers, lerp between them using the easing
 * - Otherwise, snap to the "from" value (step behavior for strings)
 * - Before the first keyframe: use first keyframe values
 * - After the last keyframe: use last keyframe values
 */
function applyKeyframes(
  node: AnyElement,
  resolved: ResolvedKeyframe[],
  tMs: number,
): void {
  if (resolved.length === 0) return;

  // Collect all attribute keys across all keyframes
  const allKeys = new Set<string>();
  for (const kf of resolved) {
    for (const key of Object.keys(kf.values)) {
      allKeys.add(key);
    }
  }

  for (const key of allKeys) {
    // Find the pair of keyframes that bracket `tMs` for this key.
    // A keyframe is relevant for a key only if it defines that key.
    let fromKf: ResolvedKeyframe | undefined;
    let toKf: ResolvedKeyframe | undefined;

    for (const kf of resolved) {
      if (!(key in kf.values)) continue;

      if (kf.timeMs <= tMs) {
        fromKf = kf;
      } else if (!toKf) {
        toKf = kf;
        break; // first keyframe after tMs — we have our pair
      }
    }

    let finalValue: string | number;

    if (!fromKf && toKf) {
      // Before the first keyframe that defines this key
      finalValue = toKf.values[key]!;
    } else if (fromKf && !toKf) {
      // After the last keyframe that defines this key
      finalValue = fromKf.values[key]!;
    } else if (fromKf && toKf) {
      const fromVal = fromKf.values[key]!;
      const toVal = toKf.values[key]!;

      if (typeof fromVal === "number" && typeof toVal === "number") {
        const segmentDuration = toKf.timeMs - fromKf.timeMs;
        if (segmentDuration <= 0) {
          finalValue = toVal;
        } else {
          const progress = clamp(0, (tMs - fromKf.timeMs) / segmentDuration, 1);
          // Use the easing from the "to" keyframe (it defines how we arrive)
          finalValue = lerp(fromVal, toVal, toKf.easingFn(progress));
        }
      } else {
        // Non-numeric: step from fromVal, snap to toVal at toKf time
        finalValue = fromVal;
      }
    } else {
      // No keyframe defines this key at all — shouldn't happen given allKeys
      continue;
    }

    // Apply to the DOM element
    if (key === "style" && finalValue !== null) {
      (node as any).style = finalValue;
    } else {
      console.log({ finalValue, key, node });
      node.setAttribute(key, String(finalValue));
    }
  }
}

/**
 * Hook that returns a `keyframes$()` function for animating
 * HTML/SVG/MathML element attributes over time, similar to CSS
 * `@keyframes` but for arbitrary DOM attributes.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const $kf = useKeyframes$();
 *
 *   return (
 *     <line
 *       ref={$kf([
 *         { at: "intro", x2: 1, y2: -0.5 },
 *         { duration: { ms: 1500 }, easing: "easeInOutSine", x2: 0, y2: 0 },
 *       ])}
 *     />
 *   );
 * }
 * ```
 */
export function usePropKeyframes<M extends string>() {
  const handlers = useRef<Map<AnyElement, { keyframes: ResolvedKeyframe[] }>>(
    new Map(),
  );

  const script = useScriptOptional<M>();

  useTime$((t) => {
    const tMs = t.inMilliseconds();
    for (const [node, { keyframes }] of handlers.current.entries()) {
      applyKeyframes(node, keyframes, tMs);
    }
  });

  return useCallback(
    function keyframes$<T extends AnyElement>(
      keyframes: Keyframes$<M, T>,
    ): (ref: T | null) => void {
      let prev: T;

      return (ref: T | null) => {
        if (prev) {
          handlers.current.delete(prev);
        }
        if (!ref) {
          return;
        }
        prev = ref;

        // Re-resolve every time — the keyframes array may change during HMR
        const resolved = resolveKeyframes(keyframes, script);

        handlers.current.set(ref, { keyframes: resolved });
      };
    },
    [script],
  );
}
