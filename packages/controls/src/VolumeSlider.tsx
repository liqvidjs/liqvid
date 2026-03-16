"use client";

import { useKeymap } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { useForceUpdate } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useEffect } from "react";

export interface AdjustVolumeShortcut {
  /** Keyboard sequence */
  seq: string;

  /**
   * A value of 5 will increase the volume by 5%; a value of -10 will decrease the volume by 10%.
   */
  delta: number;
}

export interface SetVolumeShortcut {
  /** Keyboard sequence */
  seq: string;

  /** Value between 0 and 100 to set the volume to. */
  value: number;
}

export type VolumeShortcut = AdjustVolumeShortcut | SetVolumeShortcut;

export interface VolumeSliderProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  render: (
    state: {
      muted: boolean;
      volume: number;
    },
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) => React.ReactNode;
  shortcuts?: VolumeShortcut[];
}

const VOLUME_MAX = 100;

/** Volume control */
export function VolumeSlider({
  className,
  render,
  shortcuts,
}: VolumeSliderProps) {
  const keymap = useKeymap();
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  usePlaybackEvent("volumechange", forceUpdate);

  useEffect(() => {
    // keyboard shortcuts
    const shortcutCallbacks = (shortcuts ?? []).map((s) => {
      if ("delta" in s) {
        return {
          callback: () => {
            playback.muted = false;
            playback.volume += s.delta / VOLUME_MAX;
          },
          seq: s.seq,
        };
      } else {
        return {
          callback: () => {
            playback.muted = false;
            playback.volume = s.value;
          },
          seq: s.seq,
        };
      }
    });

    for (const { seq, callback } of shortcutCallbacks) {
      keymap.bind(seq, callback);
    }

    return () => {
      // keyboard shortcuts
      for (const { seq: key, callback } of shortcutCallbacks) {
        keymap.unbind(key, callback);
      }
    };
  }, [forceUpdate, keymap, playback]);

  // input
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      playback.muted = false;
      playback.volume = parseFloat(e.target.value) / VOLUME_MAX;
    },
    [playback],
  );

  if (render) {
    return render(
      {
        muted: playback.muted,
        volume: playback.volume,
      },
      {
        // "aria-keyshortcuts": convertShortcuts(shortcuts),
        className: classNames("lv-controls-volume-slider", className),
        max: VOLUME_MAX,
        min: 0,
        onChange,
        type: "range",
        value: playback.muted ? 0 : playback.volume * VOLUME_MAX,
      },
    );
  }
}
