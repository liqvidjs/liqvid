import {
	type BooleanValueConfig,
	isClient,
	type LocalValueConfig,
	type NumericValueConfig,
	type Playback,
	useEventListener,
	usePersist,
	usePlaybackOptional,
} from "liqvid";
import { useCallback, useRef } from "react";

/* -------------------- configure persistent settings -------------------- */
export const persistColorScheme = {
	default: "light" as const,
	enum: ["light", "dark"] as const,
	name: "liqvid.color-scheme",
	source: "localStorage",
	type: "string",
} satisfies LocalValueConfig;

export const persistMute = {
	default: false,
	name: "liqvid.muted",
	source: "localStorage",
	type: "boolean",
} satisfies LocalValueConfig;

export const persistVolume = {
	default: 1,
	name: "liqvid.volume",
	source: "localStorage",
	type: "number",
} satisfies LocalValueConfig;

/* -------------------- hooks -------------------- */
// TODO: these should be handled automatically
export function usePersistMute(
	storage: BooleanValueConfig,
	playback?: Playback | null,
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
	storage: NumericValueConfig,
	playback?: Playback,
) {
	const contextPlayback = usePlaybackOptional();
	playback ??= contextPlayback;
	const [get, set] = usePersist(storage);

	useEager(() => {
		if (!playback) return;
		playback.volume = get()!;
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

export function useEager(callback: () => void) {
	const firstRun = useRef(true);
	if (firstRun.current) {
		firstRun.current = false;

		if (isClient) {
			callback();
		}
	}
}
