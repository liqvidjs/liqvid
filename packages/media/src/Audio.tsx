"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import type { AudioSourceRegistration, BufferedRange } from "@liqvid/playback";
import {
  useBufferedItem,
  usePlayback,
  usePlaybackEvent,
  useReadyStateItem,
} from "@liqvid/playback/react";
import { useScriptOptional } from "@liqvid/script/react";
import { isSafari } from "@liqvid/utils";
import { RenderMode } from "@lqv/playback/react";
import {
  Children,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { readResponseWithProgress } from "./readResponseWithProgress.ts";
import { useLoadHold } from "./useLoadHold.ts";

export type AudioProps<M extends string = string> = {
  children?: React.ReactNode;

  /** Defer audio loading until this promise resolves. */
  defer?: Promise<void>;

  /** URL to the audio file. If not provided, will search children for <source> elements. */
  src?: string;

  /** Known duration, used to report buffering before an AudioContext is ready. */
  duration?: DurationLike;

  /** Offset in seconds at which to start the audio file */
  start?: number | DurationLike | M;
};

/**
 * Get supported audio MIME types based on browser
 * Firefox and Chrome support webm, Safari only supports mp4
 */
const supportedTypes = new Set([
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  // Safari doesn't support webm or ogg
  ...(isSafari ? [] : ["audio/ogg", "audio/webm"]),
]);

/**
 * Find the first supported source from children <source> elements
 */
function findSupportedSource(children: React.ReactNode): string | undefined {
  const sources: Array<{ src: string; type?: string }> = [];

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === "source") {
      const props = child.props as { src?: string; type?: string };
      if (props.src) {
        sources.push({ src: props.src, type: props.type });
      }
    }
  });

  // Find first source with a supported type
  for (const source of sources) {
    if (source.type && supportedTypes.has(source.type)) {
      return source.src;
    }
  }

  // If no type specified, return first source
  return sources[0]?.src;
}

/**
 * Play audio synced up to the playback using Web Audio API.
 * Routes audio through the playback's audioContext for synchronized playback.
 */
export function Audio<M extends string = string>({
  children,
  defer,
  duration,
  src: srcProp,
  start = 0,
}: AudioProps<M>) {
  const renderMode = use(RenderMode);
  const playback = usePlayback();
  const script = useScriptOptional();
  const held = useLoadHold(defer);

  const isActive = renderMode === "video" || renderMode === "web";

  // Resolve the audio source URL
  const src = useMemo(() => {
    if (!isActive) return;
    if (srcProp) return srcProp;
    return findSupportedSource(children);
  }, [srcProp, children, isActive]);

  const trackLoading = isActive && Boolean(src) && !held;
  const { setReadyState } = useReadyStateItem(0, trackLoading);
  const { setBuffered } = useBufferedItem(trackLoading);

  const startInSeconds = (() => {
    if (!isActive) return 0;
    if (typeof start === "number") {
      return start;
    } else if (typeof start === "string") {
      if (Duration.isDurationString(start)) {
        return Duration.inSeconds(start);
      }
      if (!script) {
        throw new Error(
          "Audio start time is a string, but no script is available to resolve it.",
        );
      } else if (!script.has(start)) {
        throw new Error(
          `Audio start time "${start}" is not a valid marker in the script.`,
        );
      } else {
        return Duration.inSeconds(script.get(start).start);
      }
    } else {
      return Duration.inSeconds(start);
    }
  })();

  // Store the fetched array buffer (before decoding)
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);

  // Store the decoded audio buffer
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Avoid decoding the same response again when the playback context appears.
  const decodingArrayBufferRef = useRef<ArrayBuffer | null>(null);

  // Store the current buffer source node (needs to be recreated on each play)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Track playback state for the audio
  const isPlayingRef = useRef(false);

  // Store the audio source registration for offline rendering
  const registrationRef = useRef<AudioSourceRegistration | null>(null);

  /**
   * Decode downloaded audio, even before playback creates its output context.
   */
  const decodeAudio = useCallback(() => {
    const arrayBuffer = arrayBufferRef.current;
    if (
      !arrayBuffer ||
      audioBufferRef.current ||
      decodingArrayBufferRef.current === arrayBuffer
    ) {
      return;
    }

    const decodeContext =
      playback.audioContext ??
      (typeof OfflineAudioContext === "undefined"
        ? undefined
        : new OfflineAudioContext(1, 1, 48000));
    if (!decodeContext) return;

    // Clone the ArrayBuffer because decodeAudioData detaches (consumes) it
    const bufferCopy = arrayBuffer.slice(0);
    decodingArrayBufferRef.current = arrayBuffer;

    decodeContext
      .decodeAudioData(bufferCopy)
      .then((buffer) => {
        if (arrayBufferRef.current !== arrayBuffer) return;
        audioBufferRef.current = buffer;
        setReadyState(HTMLMediaElement.HAVE_ENOUGH_DATA);
        setBuffered([[startInSeconds, startInSeconds + buffer.duration]]);

        // Register this audio source for offline rendering
        if (registrationRef.current) {
          playback.unregisterAudioSource(registrationRef.current);
        }
        registrationRef.current = {
          buffer,
          startTime: startInSeconds,
        };
        playback.registerAudioSource(registrationRef.current);
      })
      .catch((error) => {
        if (arrayBufferRef.current !== arrayBuffer) return;
        console.error("Failed to decode audio:", error);
        setReadyState(HTMLMediaElement.HAVE_ENOUGH_DATA);
      })
      .finally(() => {
        if (decodingArrayBufferRef.current === arrayBuffer) {
          decodingArrayBufferRef.current = null;
        }
      });
  }, [playback, setBuffered, setReadyState, startInSeconds]);

  /**
   * Stop the current audio source
   */
  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  /**
   * Start playing audio from a given offset within the audio buffer
   */
  const playAudio = useCallback(
    (offsetInBuffer: number) => {
      const audioContext = playback.audioContext;
      const audioBuffer = audioBufferRef.current;

      if (!audioContext || !audioBuffer || !playback.audioNode) return;

      // Stop any existing playback
      stopAudio();

      // Don't play if offset is outside the buffer
      if (offsetInBuffer < 0 || offsetInBuffer >= audioBuffer.duration) {
        return;
      }

      // Create a new buffer source
      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.playbackRate.value = playback.playbackRate;

      // Connect to playback's audioNode (GainNode) for volume control
      sourceNode.connect(playback.audioNode);

      // Store references
      sourceNodeRef.current = sourceNode;
      isPlayingRef.current = true;

      // Start playback from the offset
      sourceNode.start(0, offsetInBuffer);

      // Handle when audio finishes naturally
      sourceNode.onended = () => {
        if (sourceNodeRef.current === sourceNode) {
          isPlayingRef.current = false;
          sourceNodeRef.current = null;
        }
      };
    },
    [playback, stopAudio],
  );

  /**
   * Calculate the current offset within the audio buffer based on playback time
   */
  const getBufferOffset = useCallback(() => {
    // playback.currentTime is in seconds
    const playbackTime = playback.currentTime;

    // Offset within the audio buffer
    return playbackTime - startInSeconds;
  }, [playback, startInSeconds]);

  /**
   * Sync audio state with playback state
   */
  const syncAudio = useCallback(() => {
    const audioBuffer = audioBufferRef.current;
    if (!audioBuffer) return;

    const offsetInBuffer = getBufferOffset();
    const isWithinRange =
      offsetInBuffer >= 0 && offsetInBuffer < audioBuffer.duration;

    if (!playback.paused && isWithinRange) {
      // Should be playing
      if (!isPlayingRef.current) {
        playAudio(offsetInBuffer);
      }
    } else {
      // Should be paused or outside range
      if (isPlayingRef.current) {
        stopAudio();
      }
    }
  }, [getBufferOffset, playAudio, playback.paused, stopAudio]);

  // Fetch the audio file immediately
  useEffect(() => {
    if (!src || held) {
      setReadyState(HTMLMediaElement.HAVE_NOTHING);
      setBuffered([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const durationInSeconds =
      duration === undefined ? undefined : Duration.inSeconds(duration);
    const onProgress = createBufferProgressHandler(
      startInSeconds,
      durationInSeconds,
      setBuffered,
    );
    arrayBufferRef.current = null;
    audioBufferRef.current = null;
    setReadyState(HTMLMediaElement.HAVE_NOTHING);
    setBuffered([]);

    fetch(src, { signal: controller.signal })
      .then((response) => readResponseWithProgress(response, onProgress))
      .then((arrayBuffer) => {
        if (cancelled) return;
        arrayBufferRef.current = arrayBuffer;
        reportAudioLoaded(
          startInSeconds,
          durationInSeconds,
          setBuffered,
          setReadyState,
        );
        // Try to decode immediately if audioContext is available
        decodeAudio();
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch audio:", error);
        setReadyState(HTMLMediaElement.HAVE_ENOUGH_DATA);
      });

    return () => {
      cancelled = true;
      controller.abort();
      stopAudio();
    };
  }, [
    src,
    held,
    duration,
    decodeAudio,
    setBuffered,
    setReadyState,
    startInSeconds,
    stopAudio,
  ]);

  // Decode audio when audioContext becomes available
  usePlaybackEvent(
    "audiocontextchange",
    () => {
      decodeAudio();
      syncAudio();
    },
    { enabled: isActive },
  );

  // Handle play event
  usePlaybackEvent("play", syncAudio, { enabled: isActive });

  // Handle pause event
  usePlaybackEvent("pause", stopAudio, { enabled: isActive });

  // Handle stop event
  usePlaybackEvent("stop", stopAudio, { enabled: isActive });

  // Handle seek events - need to restart audio at new position
  usePlaybackEvent("seeked", syncAudio, { enabled: isActive });

  // Handle seeking (while dragging) - pause audio
  usePlaybackEvent("seeking", stopAudio, { enabled: isActive });

  // Handle timeupdate - start/stop audio when entering/exiting time range
  usePlaybackEvent("timeupdate", syncAudio, { enabled: isActive });

  // Handle playback rate changes
  usePlaybackEvent(
    "ratechange",
    () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.playbackRate.value = playback.playbackRate;
      }
    },
    { enabled: isActive },
  );

  // Cleanup on unmount
  useEffect(() => {
    if (!isActive) return;
    return () => {
      stopAudio();
      // Unregister from offline rendering
      if (registrationRef.current) {
        playback.unregisterAudioSource(registrationRef.current);
        registrationRef.current = null;
      }
    };
  }, [playback, stopAudio, isActive]);

  if (renderMode === "screenshot" || renderMode === "thumbnails") {
    return null;
  }

  return <div>{children}</div>;
}

function createBufferProgressHandler(
  startInSeconds: number,
  durationInSeconds: number | undefined,
  setBuffered: (ranges: readonly BufferedRange[]) => void,
): ((progress: number) => void) | undefined {
  if (durationInSeconds === undefined) return;

  return (progress) => {
    // Approximate the sequential media-time range from downloaded bytes.
    const loadedDuration = durationInSeconds * progress;
    setBuffered([[startInSeconds, startInSeconds + loadedDuration]]);
  };
}

function reportAudioLoaded(
  startInSeconds: number,
  durationInSeconds: number | undefined,
  setBuffered: (ranges: readonly BufferedRange[]) => void,
  setReadyState: (readyState: number) => void,
): void {
  setReadyState(HTMLMediaElement.HAVE_METADATA);
  if (durationInSeconds === undefined) {
    return;
  }

  setBuffered([[startInSeconds, startInSeconds + durationInSeconds]]);
}
