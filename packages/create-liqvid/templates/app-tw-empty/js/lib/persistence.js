import {
	isClient,
	useEventListener,
	usePersist,
	usePlaybackOptional,
} from "liqvid";
import { useCallback, useRef } from "react";

/* ------------------------------ configure persistent settings  ------------------------------ */
export const persistColorScheme = {
	default: "light" ,
	enum: ["light", "dark"] ,
	name: "liqvid.color-scheme",
	source: "localStorage",
	type: "string",
} ;

export const persistMute = {
	default: false,
	name: "liqvid.muted",
	source: "localStorage",
	type: "boolean",
} ;

export const persistVolume = {
	default: 1,
	name: "liqvid.volume",
	source: "localStorage",
	type: "number",
} ;

/* ------------------------------ hooks ------------------------------ */
// TODO: these should be handled automatically
export function usePersistMute(
	storage,
	playback,
) {
	const contextPlayback = usePlaybackOptional();
	playback ??= contextPlayback;

	const [get, set] = usePersist(storage);

	useEager(() => {
		if (!playback) return;
		playback.muted = get() ?? false;
	});

	useEventListener(
		playback,
		"volumechange",
		useCallback(() => {
			if (!playback) return;
			set(playback.muted);
		}, [playback, set]),
	);
}

export function usePersistVolume(
	storage,
	playback,
) {
	const contextPlayback = usePlaybackOptional();
	playback ??= contextPlayback;
	const [get, set] = usePersist(storage);

	useEager(() => {
		if (!playback) return;
		playback.volume = get();
	});

	useEventListener(
		playback,
		"volumechange",
		useCallback(() => {
			if (!playback) return;
			set(playback.volume);
		}, [playback, set]),
	);
}

export function useEager(callback) {
	const firstRun = useRef(true);
	if (firstRun.current) {
		firstRun.current = false;

		if (isClient) {
			callback();
		}
	}
}
