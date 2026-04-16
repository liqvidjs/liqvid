"use client";

import { useEventListener } from "@liqvid/event-emitter/react";
import type { SyntheticTextTrack } from "@liqvid/playback";
import { usePlayback } from "@liqvid/playback/react";
import classNames from "classnames";
import { useCallback, useEffect, useState } from "react";

export interface CaptionsDisplayProps {
  /** Additional CSS class name */
  className?: string;
}

/**
 * Displays active captions from all text tracks with mode "showing".
 *
 * Listens to the "cuechange" event on the playback object and updates
 * the displayed captions accordingly.
 *
 * @example
 * ```tsx
 * <Player>
 *   <Track src="/captions/en.vtt" kind="subtitles" label="English" default />
 *   <CaptionsDisplay />
 * </Player>
 * ```
 */
export function CaptionsDisplay({ className }: CaptionsDisplayProps) {
  const playback = usePlayback();
  const [captions, setCaptions] = useState<string[]>([]);

  const updateCaptions = useCallback(() => {
    const activeCaptions: string[] = [];

    // Iterate through all text tracks
    for (const track of playback.textTracks) {
      // Only show tracks with mode "showing"
      if (track.mode !== "showing") continue;

      // Collect active cues from this track
      for (const cue of track.activeCues) {
        if (cue.text) {
          activeCaptions.push(cue.text);
        }
      }
    }

    setCaptions(activeCaptions);
  }, [playback]);

  useEventListener(playback.textTracks, "change", updateCaptions);
  useEventListener(playback.textTracks, "addtrack", updateCaptions);
  useEventListener(playback.textTracks, "removetrack", updateCaptions);

  useEffect(() => {
    updateCaptions();
  }, [updateCaptions]);

  const handlers = new Map<SyntheticTextTrack, () => void>();

  const setupTrackListeners = () => {
    // Remove old listeners
    for (const [track, handler] of handlers) {
      track.removeEventListener("cuechange", handler);
    }
    handlers.clear();

    // Add listeners for current tracks
    for (const track of playback.textTracks) {
      const handler = () => updateCaptions();
      track.addEventListener("cuechange", handler);
      handlers.set(track, handler);
    }
  };

  for (const [track, handler] of handlers) {
    track.removeEventListener("cuechange", handler);
  }
  handlers.clear();

  setupTrackListeners();

  // Re-setup when tracks change
  const handleTrackListChange = () => {
    setupTrackListeners();
  };

  playback.textTracks.addEventListener("addtrack", handleTrackListChange);
  playback.textTracks.addEventListener("removetrack", handleTrackListChange);

  if (captions.length === 0) {
    return null;
  }

  return (
    <pre className={classNames("lv-captions-display", className)}>
      {captions}
    </pre>
  );
}

export const Captions = {
  Display: CaptionsDisplay,
};
