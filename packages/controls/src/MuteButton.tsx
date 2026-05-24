"use client";

import { type BooleanValueConfig, usePersist } from "@liqvid/hydration";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { usePlayback, usePlaybackEvent } from "@liqvid/playback/react";
import { IS_CLIENT } from "@liqvid/ssr";
import { onClickReact, useForceUpdate } from "@liqvid/utils";
import clsx from "clsx";
import { useCallback, useMemo, useRef } from "react";

import { convertShortcuts } from "./utils.ts";

interface MutePropsBase {
  className?: string;

  /**
   * Persistence configuration for the muted state.
   * If provided, the muted state will be persisted to the specified storage.
   */
  persistence?: BooleanValueConfig;

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
export function Mute({ className, persistence, render, shortcuts }: MuteProps) {
  const playback = usePlayback();
  const forceUpdate = useForceUpdate();

  // Persistence hook
  const [getMute, setMute] = usePersist(persistence!, {
    disabled: !persistence,
  });

  useEager(() => {
    if (!playback) return;
    playback.muted = getMute() ?? persistence?.default ?? false;
  });

  // Persist changes on volumechange event
  const handleVolumeChange = useCallback(() => {
    forceUpdate();

    if (persistence) {
      setMute(playback.muted);
    }
  }, [forceUpdate, persistence, playback, setMute]);

  usePlaybackEvent("volumechange", handleVolumeChange);

  // keyboard controls
  const toggleMute = useCallback(() => {
    playback.muted = !playback.muted;
  }, [playback]);

  useKeyboardShortcut(shortcuts, toggleMute);

  const events = useMemo(() => onClickReact(toggleMute), [toggleMute]);

  if (render) {
    return render(
      {
        muted: playback.muted,
        volume: playback.volume,
      },
      {
        "aria-keyshortcuts": convertShortcuts(shortcuts),
        className: clsx("lv-controls-mute lv-controls-button", className),
        ...events,
      },
    );
  }
}

function useEager(callback: () => void) {
  const firstRun = useRef(true);
  if (firstRun.current) {
    firstRun.current = false;

    if (IS_CLIENT) {
      callback();
    }
  }
}
