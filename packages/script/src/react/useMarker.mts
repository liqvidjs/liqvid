import { useEventListener } from "@liqvid/event-emitter/react";
import { useCallback, useMemo, useRef, useState } from "react";

import type { MarkerUpdateEvent } from "../script.mts";
import type { Marker } from "../types.mts";

import { useScript } from "./useScript.tsx";

/** Get the active marker */
export function useMarker<M extends string>(): Marker<M>;

/** Callback with active marker */
export function useMarker<M extends string>(
	callback: (active: Marker<M>, prev: Marker<M>) => unknown,
): void;

/** Callback with active marker and selector function */
export function useMarker<M extends string, T>(
	selector: (marker: Marker<M>) => T,
	callback: (active: T, prev: T) => unknown,
): void;

export function useMarker<M extends string, T>(
	...args:
		| []
		| [callback: (active: Marker<M>, prev: Marker<M>) => unknown]
		| [
				selector: (active: Marker<M>, prev: Marker<M>) => T,
				callback: (active: T, prev: T) => unknown,
		  ]
) {
	const script = useScript<M>();

	const selector: (marker: Marker<M>) => T = useMemo(() => {
		if (args.length < 2) return (m: Marker<M>) => m as unknown as T;
		return args[0] as unknown as (m: Marker<M>) => T;
	}, [args.length, args[0]]);

	const [activeMarker, setActiveMarker] = useState(script.active);

	const prevValue = useRef<T>(selector(script.active));

	const check = useCallback(
		({ prev, target: { active } }: MarkerUpdateEvent<M>) => {
			switch (args.length) {
				case 0:
					setActiveMarker(active);
					break;
				case 1:
					args[0](active, prev);
					break;
				case 2: {
					const value = args[0](active, prev);
					if (value === prevValue.current) return;
					args[1](value, prevValue.current);
					prevValue.current = value;
				}
			}
		},
		[args.length, args[0], args[1]],
	);

	useEventListener(script, "markerupdate", check);

	if (args.length === 0) return activeMarker;
}
