import type { DurationString } from "@liqvid/utils";

export function withTimings<const M extends string>(
  markerNames: readonly M[],
  timings: Partial<Readonly<Record<M, DurationString>>>,
): [M, DurationString][] {
  return markerNames.map((m) => [m, timings[m] ?? ("1:00" as DurationString)]);
}

export function withTimingsStrict<const M extends string>(
  markerNames: readonly M[],
  timings: Readonly<Record<M, DurationString>>,
): [M, DurationString][] {
  return markerNames.map((m) => [m, timings[m] ?? ("1:00" as DurationString)]);
}
