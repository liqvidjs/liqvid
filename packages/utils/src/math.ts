/** Equivalent to `(min <= val) && (val < max)`. */
export function between(min: number, val: number, max: number) {
  return min <= val && val < max;
}

/**
 * Clamps a value between a lower and upper bound. Aliased as {@link constrain}.
 * @param min Lower bound
 * @param val Value to clamp
 * @param max Upper bound
 */
export function clamp(min: number, val: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Clamps a value between a lower and upper bound. Alias for {@link clamp}.
 * @param min Lower bound
 * @param val Value to clamp
 * @param max Upper bound
 */
export function constrain(min: number, val: number, max: number) {
  return clamp(min, val, max);
}

/**
 * Linear interpolation from a to b.
 */
export function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
}

/** Remap a value in [inLow, inHigh] to a value in [outLow, outHigh] */
export function scale({
  inHigh,
  inLow = 0,
  outHigh,
  outLow = 0,
  value,
}: {
  inLow?: number;
  inHigh: number;

  outLow?: number;
  outHigh: number;

  value: number;
}): number {
  return outLow + ((value - inLow) / (inHigh - inLow)) * (outHigh - outLow);
}
