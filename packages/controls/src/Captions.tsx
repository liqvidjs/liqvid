"use client";

import { useEventListener } from "@liqvid/event-emitter/react";
import { type BooleanValueConfig, usePersistentState } from "@liqvid/hydration";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import type { SyntheticTextTrack } from "@liqvid/playback";
import { usePlayback } from "@liqvid/playback/react";
import { usePlayer } from "@liqvid/player";
import { useInitial } from "@liqvid/utils";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";

import { convertShortcuts } from "./utils.ts";

export type CaptionsToggleProps = {
  className?: string;
  render: (
    state: {
      enabled: boolean;
    },
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  persistence?: BooleanValueConfig;
  shortcuts?: string | string[];
};

/** Button to toggle captions. */
function CaptionsToggle({
  className,
  persistence,
  render,
  shortcuts,
}: CaptionsToggleProps) {
  const { domElement } = usePlayer();
  const playback = usePlayback();

  const [enabled, setEnabled] = usePersistentState(
    persistence ?? {
      default: false,
      name: "",
      source: "localStorage",
      type: "boolean",
    },
    {
      disabled: !persistence,
    },
  );

  const updateTextTracks = useCallback(
    (showing: boolean) => {
      for (const textTrack of playback.textTracks) {
        textTrack.mode = showing ? "showing" : "hidden";
      }
    },
    [playback.textTracks],
  );

  // initial persistence
  const initialEnabled = useInitial(enabled);
  useEffect(() => {
    updateTextTracks(initialEnabled);
  }, [updateTextTracks]);

  const toggleCaptions = (
    e:
      | KeyboardEvent
      | React.MouseEvent<HTMLButtonElement>
      | React.TouchEvent<HTMLButtonElement>,
  ) => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);

    // update properties on the player DOM element for styling purposes
    if (domElement) {
      domElement.dataset.captions = newEnabled ? "showing" : "hidden";
    }

    // blur or keyboard controls will get snagged
    if (e.currentTarget instanceof HTMLButtonElement) e.currentTarget.blur();

    // toggle the mode of all text tracks
    updateTextTracks(newEnabled);
  };

  useKeyboardShortcut(shortcuts, toggleCaptions);

  const [isEmpty, setIsEmpty] = useState(playback.textTracks.length === 0);

  useEventListener(playback.textTracks, "addtrack", () => {
    updateTextTracks(enabled);
    setIsEmpty(playback.textTracks.length === 0);
  });
  useEventListener(playback.textTracks, "removetrack", () => {
    updateTextTracks(enabled);
    setIsEmpty(playback.textTracks.length === 0);
  });

  if (isEmpty) return null;

  return render(
    { enabled },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: clsx("lv-captions", className),
      onClick: toggleCaptions,
    },
  );
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
function CaptionsDisplay(props: Omit<React.ComponentProps<"div">, "children">) {
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

  return <div {...props}>{captions}</div>;
}

export const Captions = {
  Display: CaptionsDisplay,
  Toggle: CaptionsToggle,
};
