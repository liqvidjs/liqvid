import type { Duration } from "@liqvid/duration";

export interface AbstractMarker<M extends string = string> {
  duration: Duration;
  name: M;
}

export interface Marker<M extends string = string> extends AbstractMarker<M> {
  get start(): Duration;
  get end(): Duration;
  get index(): number;
}

export type SerializedMarker<M extends string = string> = readonly [
  name: M,
  ms: number,
];

export type MarkerFormatted<M extends string = string> = readonly [
  name: M,
  formattedTime: string,
];
