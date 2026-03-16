"use client";

import { useKeymap } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { onClickReact, useForceUpdate } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useEffect, useMemo } from "react";

import { bind, convertShortcuts, unbind } from "./utils";

interface MutePropsBase {
  className?: string;
  shortcuts?: string[] | string;
}

interface MutesPropsCustomRender {
  render: (
    state: {
      muted: boolean;
      volume: number;
    },
    props: React.HTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  variants?: undefined;
}

interface MutePropsVariants {
  render?: undefined;
  variants: {
    muted?: true;
    gte?: number;
    lt?: number;
    props: React.ButtonHTMLAttributes<HTMLButtonElement>;
  }[];
}

export type MuteProps = MutePropsBase &
  (MutesPropsCustomRender | MutePropsVariants);

/** Mute/unmute button */
export function Mute({ className, render, shortcuts }: MuteProps) {
  const keymap = useKeymap();
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  // keyboard controls
  const toggleMute = useCallback(() => {
    playback.muted = !playback.muted;
  }, [playback]);

  usePlaybackEvent("volumechange", forceUpdate);

  useEffect(() => {
    // keyboard shortcuts
    bind(keymap, shortcuts, toggleMute);

    return () => {
      // keyboard shortcuts
      unbind(keymap, shortcuts, toggleMute);
    };
  }, [keymap, shortcuts, toggleMute]);

  const events = useMemo(() => onClickReact(toggleMute), [toggleMute]);

  if (render) {
    return render(
      {
        muted: playback.muted,
        volume: playback.volume,
      },
      {
        "aria-keyshortcuts": convertShortcuts(shortcuts),
        className: classNames("lv-controls-mute lv-controls-button", className),
        ...events,
      },
    );
  }
}
