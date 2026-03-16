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
