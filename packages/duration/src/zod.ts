import { z } from "zod";

/**
 * These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
 * equivalent to passing `{seconds: 320}`.
 */
export const DurationOptions = z.object({
  /** shortcut for days */
  d: z.number().optional(),
  days: z.number().optional(),

  /** shortcut for hours */
  h: z.number().optional(),
  hours: z.number().optional(),

  /** shortcut for minutes */
  m: z.number().optional(),
  milliseconds: z.number().optional(),
  minutes: z.number().optional(),

  /** shortcut for milliseconds */
  ms: z.number().optional(),

  /** shortcut for seconds */
  s: z.number().optional(),
  seconds: z.number().optional(),

  /** shortcut for weeks */
  w: z.number().optional(),
  weeks: z.number().optional(),
});

export type DurationOptions = z.infer<typeof DurationOptions>;
