import {
	type BooleanValueConfig,
	isClient,
	type NumericValueConfig,
	type Playback,
	useEventListener,
	usePersist,
	usePlaybackOptional,
} from "liqvid";
import { useCallback, useRef } from "react";

export const mutedStorageKey = "liqvid.muted";
export const volumeStorageKey = "liqvid.volume";

function useEager(callback: () => void) {
	const firstRun = useRef(true);
	if (firstRun.current) {
		firstRun.current = false;

		if (isClient) {
			callback();
		}
	}
}

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
