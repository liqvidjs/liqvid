import { Duration as EffectDuration, Schema } from "effect";

import { Duration, type DurationLike } from "./index.ts";

/**
 * These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
 * equivalent to passing `{seconds: 320}`.
 */

// biome-ignore assist/source/useSortedKeys: colocation
export const DurationOptions = Schema.Struct({
  /** shortcut for days */
  d: Schema.Number.pipe(Schema.optional),
  days: Schema.Number.pipe(Schema.optional),

  // /** shortcut for hours */
  h: Schema.Number.pipe(Schema.optional),

  hours: Schema.Number.pipe(Schema.optional),

  /** shortcut for minutes */
  m: Schema.Number.pipe(Schema.optional),
  minutes: Schema.Number.pipe(Schema.optional),

  /** shortcut for milliseconds */
  ms: Schema.Number.pipe(Schema.optional),
  milliseconds: Schema.Number.pipe(Schema.optional),

  /** shortcut for seconds */
  s: Schema.Number.pipe(Schema.optional),
  seconds: Schema.Number.pipe(Schema.optional),

  /** shortcut for weeks */
  w: Schema.Number.pipe(Schema.optional),
  weeks: Schema.Number.pipe(Schema.optional),
});

export type DurationOptions = Schema.Schema.Type<typeof DurationOptions>;

/**
 * Convert a Liqvid Duration to an Effect Duration.
 */
export function toEffectDuration(
  duration: DurationLike,
): EffectDuration.Duration {
  return EffectDuration.millis(Duration.inMilliseconds(duration));
}

/**
 * Convert an Effect Duration to a Liqvid Duration.
 */
export function fromEffectDuration(
  duration: EffectDuration.Duration,
): Duration {
  return new Duration({ milliseconds: EffectDuration.toMillis(duration) });
}
