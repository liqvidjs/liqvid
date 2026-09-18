export function withTimings<const M extends string>(
  markerNames: readonly M[],
  timings: Partial<Readonly<Record<M, string>>>,
): [M, string][] {
  return markerNames.map((m) => [m, timings[m] ?? "1:00"]);
}

export function withTimingsStrict<const M extends string>(
  markerNames: readonly M[],
  timings: Readonly<Record<M, string>>,
): [M, string][] {
  return markerNames.map((m) => [m, timings[m] ?? "1:00"]);
}
