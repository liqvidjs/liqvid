"use client";

import { Duration, type DurationLike } from "@liqvid/duration";
import type { AudioSourceRegistration } from "@liqvid/playback";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

export type AudioProps = {
  children?: React.ReactNode;

  /** URL to the audio file. If not provided, will search children for <source> elements. */
  src?: string;

  /** Offset in seconds at which to start the audio file */
  start?: number | DurationLike;
};

/**
 * Detect if the browser is Safari (which only supports mp4, not webm)
 */
function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium")
  );
}

/**
 * Get supported audio MIME types based on browser
 * Firefox and Chrome support webm, Safari only supports mp4
 */
function getSupportedTypes(): Set<string> {
  if (isSafari()) {
    return new Set(["audio/mp4", "audio/mpeg", "audio/aac"]);
  }
  // Firefox and Chrome
  return new Set([
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/aac",
  ]);
}

/**
 * Find the first supported source from children <source> elements
 */
function findSupportedSource(children: React.ReactNode): string | undefined {
  const supportedTypes = getSupportedTypes();

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
  if (sources.length > 0) {
    return sources[0].src;
  }

  return undefined;
}

/**
 * Play audio synced up to the playback using Web Audio API.
 * Routes audio through the playback's audioContext for synchronized playback.
 */
export function Audio({ children, src: srcProp, start = 0 }: AudioProps) {
  const playback = usePlayback();

  // Resolve the audio source URL
  const src = useMemo(() => {
    if (srcProp) return srcProp;
    return findSupportedSource(children);
  }, [srcProp, children]);

  const startInSeconds =
    typeof start === "number" ? start : Duration.from(start).inSeconds();

  // Store the fetched array buffer (before decoding)
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);

  // Store the decoded audio buffer
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Store the current buffer source node (needs to be recreated on each play)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Track playback state for the audio
  const isPlayingRef = useRef(false);

  // Store the audio source registration for offline rendering
  const registrationRef = useRef<AudioSourceRegistration | null>(null);

  /**
   * Decode the audio data once audioContext is available
   */
  const decodeAudio = useCallback(() => {
    const audioContext = playback.audioContext;
    const arrayBuffer = arrayBufferRef.current;
    if (!audioContext || !arrayBuffer || audioBufferRef.current) return;

    // Clone the ArrayBuffer because decodeAudioData detaches (consumes) it
    const bufferCopy = arrayBuffer.slice(0);

    audioContext
      .decodeAudioData(bufferCopy)
      .then((buffer) => {
        audioBufferRef.current = buffer;

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
        console.error("Failed to decode audio:", error);
      });
  }, [playback, startInSeconds]);

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
    if (!src) return;

    let cancelled = false;
    arrayBufferRef.current = null;
    audioBufferRef.current = null;

    fetch(src)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        if (cancelled) return;
        arrayBufferRef.current = arrayBuffer;
        // Try to decode immediately if audioContext is available
        decodeAudio();
      })
      .catch((error) => {
        console.error("Failed to fetch audio:", error);
      });

    return () => {
      cancelled = true;
      stopAudio();
    };
  }, [src, decodeAudio, stopAudio]);

  // Decode audio when audioContext becomes available
  usePlaybackEvent("audiocontextchange", decodeAudio);

  // Handle play event
  usePlaybackEvent("play", syncAudio);

  // Handle pause event
  usePlaybackEvent("pause", stopAudio);

  // Handle stop event
  usePlaybackEvent("stop", stopAudio);

  // Handle seek events - need to restart audio at new position
  usePlaybackEvent("seeked", syncAudio);

  // Handle seeking (while dragging) - pause audio
  usePlaybackEvent("seeking", stopAudio);

  // Handle timeupdate - start/stop audio when entering/exiting time range
  usePlaybackEvent("timeupdate", syncAudio);

  // Handle playback rate changes
  usePlaybackEvent("ratechange", () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = playback.playbackRate;
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      // Unregister from offline rendering
      if (registrationRef.current) {
        playback.unregisterAudioSource(registrationRef.current);
        registrationRef.current = null;
      }
    };
  }, [playback, stopAudio]);

  return <div>{children}</div>;
}
