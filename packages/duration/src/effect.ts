import { Schema } from "effect";

/**
 * These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
 * equivalent to passing `{seconds: 320}`.
 */
export const DurationOptions = Schema.Struct({
  /** shortcut for days */
  d: Schema.Option(Schema.Number),
  days: Schema.Option(Schema.Number),

  // /** shortcut for hours */
  h: Schema.Option(Schema.Number),
  hours: Schema.Option(Schema.Number),

  /** shortcut for minutes */
  m: Schema.Option(Schema.Number),
  milliseconds: Schema.Option(Schema.Number),
  minutes: Schema.Option(Schema.Number),

  /** shortcut for milliseconds */
  ms: Schema.Option(Schema.Number),

  /** shortcut for seconds */
  s: Schema.Option(Schema.Number),
  seconds: Schema.Option(Schema.Number),

  /** shortcut for weeks */
  w: Schema.Option(Schema.Number),
  weeks: Schema.Option(Schema.Number),
});

export type DurationOptions = Schema.Schema.Type<typeof DurationOptions>;
