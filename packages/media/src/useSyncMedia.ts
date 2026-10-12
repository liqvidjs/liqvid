import { Duration, type DurationLike } from "@liqvid/duration";
import {
  useBufferedItem,
  usePlayback,
  usePlaybackEvent,
  useReadyStateItem,
} from "@liqvid/playback/react";
import { useStableDuration } from "@liqvid/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface MediaProps {
  /** Defer media loading until this promise resolves. */
  defer?: Promise<void>;

  obstructCanPlay?: boolean;
  obstructCanPlayThrough?: boolean;
  start?: DurationLike;
}

export function useSyncMedia<T extends HTMLMediaElement>(
  ref: React.RefObject<T | null>,
  start: DurationLike = {},
  enabled = true,
) {
  const start$ = useStableDuration(start);
  const playback = usePlayback();

  const [end, setEnd] = useState(() =>
    start$.plus({ seconds: ref.current?.duration ?? 0 }),
  );

  useEffect(() => {
    const update = () => {
      setEnd(start$.plus({ seconds: ref.current?.duration ?? 0 }));
    };

    update();

    ref.current?.addEventListener("durationchange", update);

    return () => {
      ref.current?.removeEventListener("durationchange", update);
    };
  }, [ref, start$]);

  // canplay/canplaythrough events
  // if (props.obstructCanPlay) {
  //   player.obstruct("canplay", awaitMediaCanPlay(domElement));
  // }
  // if (props.obstructCanPlayThrough) {
  //   player.obstruct("canplaythrough", awaitMediaCanPlayThrough(domElement));
  // }

  // volumechange
  const onVolumeChange = useCallback((): void => {
    const domElement = ref.current;
    if (!domElement) return;

    domElement.volume = playback.volume;
    domElement.muted = playback.muted;
  }, [playback, ref]);

  /* ------------------------- synced playing ------------------------- */
  const { onDomPlay, play } = useMemo(() => {
    const playCallback = async () => {
      const domElement = ref.current;
      if (!domElement) return;

      domElement.removeEventListener("play", domPlayCallback);
      const promise = domElement.play();
      domElement.addEventListener("play", domPlayCallback);
      return promise;
    };

    const domPlayCallback = () => {
      if (playback.paused) {
        playback.removeEventListener("play", playCallback);
        playback.play();
        playback.addEventListener("play", playCallback);
      }
    };

    return { onDomPlay: domPlayCallback, play: playCallback };
  }, [playback, ref]);

  // don't use useEventListener due to change magic
  useEffect(() => {
    playback.addEventListener("play", play);
    ref.current?.addEventListener("play", onDomPlay);

    return () => {
      playback.removeEventListener("play", play);
      ref.current?.removeEventListener("play", onDomPlay);
    };
  }, [onDomPlay, playback, play, ref]);

  /* ------------------------- synced pausing ------------------------- */
  const { onDomPause, pause } = useMemo(() => {
    const onPausePlayback = () => {
      const domElement = ref.current;
      if (!domElement) return;

      if (!domElement.ended) {
        domElement.removeEventListener("pause", onPauseDom);
        domElement.pause();
        domElement.addEventListener("pause", onPauseDom);
      }
    };

    const onPauseDom = () => {
      const domElement = ref.current;
      if (!domElement) return;
      if (!playback.seeking && !playback.paused && !hasEnded(domElement)) {
        playback.removeEventListener("pause", onPausePlayback);
        playback.pause();
        playback.addEventListener("pause", onPausePlayback);
      }
    };

    return { onDomPause: onPauseDom, pause: onPausePlayback };
  }, [playback, ref]);

  const onTimeUpdate = useCallback(() => {
    const domElement = ref.current;
    if (!domElement) return;

    const t = playback.currentTime$;

    if (t.between(start, end)) {
      if (!domElement.paused) return;

      domElement.currentTime = t.minus(start).inSeconds();
      if (!playback.paused) {
        play().catch(playback.pause);
      }
    } else {
      if (!domElement.paused) pause();
      domElement.currentTime = t.minus(start).inSeconds();
    }
  }, [end, pause, play, playback, ref, start]);

  // don't use useEventListener due to change magic
  useEffect(() => {
    playback.addEventListener("pause", pause);
    ref.current?.addEventListener("pause", onDomPause);

    return () => {
      playback.removeEventListener("pause", pause);
      ref.current?.removeEventListener("pause", onDomPause);
    };
  }, [onDomPause, playback, pause, ref]);

  // /* ------------------------- simple event listeners ------------------------- */
  // ratechange
  usePlaybackEvent("ratechange", () => {
    const domElement = ref.current;
    if (!domElement) return;

    domElement.playbackRate = playback.playbackRate;
  });

  // seek
  usePlaybackEvent("seeked", ({ target: playback }) => {
    const domElement = ref.current;
    if (!domElement) return;

    const t = playback.currentTime$;

    domElement.currentTime = t.minus(start).inSeconds();

    if (t.between(start, end)) {
      if (domElement.paused && !playback.paused && !playback.seeking) {
        play().catch(playback.pause);
      }
    } else {
      if (!domElement.paused) pause();
    }
  });

  usePlaybackEvent("seeking", pause);
  usePlaybackEvent("timeupdate", onTimeUpdate);
  usePlaybackEvent("volumechange", onVolumeChange);

  // need to call this once initially
  useEffect(() => {
    onVolumeChange();
  }, [onVolumeChange]);

  /* ------------------------------ readyState ------------------------------ */
  useSyncReadyState(ref, start$, enabled);
}

/**
 * Guess whether a media element has ended.
 * (`paused` fires before `ended`, and `currentTime` may be >100ms
 * behind `duration` when this happens).
 * @param media Media element to check.
 * @param threshold How far from the end of the media should be considered "ended".
 * @returns Whether the media element has reached its end.
 */
function hasEnded(media: HTMLMediaElement, threshold = 0.5): boolean {
  return media.ended || media.duration - media.currentTime < threshold;
}

function useSyncReadyState(
  ref: React.RefObject<HTMLMediaElement | null>,
  start: DurationLike,
  enabled: boolean,
) {
  const { setReadyState } = useReadyStateItem(0, enabled);
  const { setBuffered } = useBufferedItem(enabled);

  const updateMediaState = useCallback(() => {
    const media = ref.current;
    if (!media) {
      setReadyState(HTMLMediaElement.HAVE_NOTHING);
      setBuffered([]);
      return;
    }

    setReadyState(media.readyState);
    const ranges: Array<readonly [number, number]> = [];
    const offset = Duration.inSeconds(start);

    for (let index = 0; index < media.buffered.length; index++) {
      ranges.push([
        offset + media.buffered.start(index),
        offset + media.buffered.end(index),
      ]);
    }
    setBuffered(ranges);
  }, [ref, setBuffered, setReadyState, start]);

  useEffect(() => {
    if (!enabled) return;
    const media = ref.current;
    if (!media) return;

    const events = [
      "abort",
      "canplay",
      "canplaythrough",
      "durationchange",
      "emptied",
      "error",
      "loadeddata",
      "loadedmetadata",
      "loadstart",
      "playing",
      "progress",
      "seeked",
      "seeking",
      "stalled",
      "suspend",
      "waiting",
    ] as const;

    updateMediaState();
    for (const event of events) {
      media.addEventListener(event, updateMediaState);
    }
    return () => {
      for (const event of events) {
        media.removeEventListener(event, updateMediaState);
      }
    };
  }, [enabled, ref, updateMediaState]);
}
