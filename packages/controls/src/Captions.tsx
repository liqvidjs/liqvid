"use client";

import { type BooleanValueConfig, usePersistentState } from "@liqvid/hydration";
import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { usePlayback } from "@liqvid/playback/react";
import { usePlayer } from "@liqvid/player";
import clsx from "clsx";
import { useCallback } from "react";

import { convertShortcuts } from "./utils";

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

/** Captions control. */
export function CaptionsToggle({
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

  const toggleCaptions = useCallback(
    (
      e:
        | KeyboardEvent
        | React.MouseEvent<HTMLButtonElement>
        | React.TouchEvent<HTMLButtonElement>,
    ) => {
      domElement?.classList.toggle("lv-captions");
      setEnabled((enabled) => !enabled);

      // blur or keyboard controls will get snagged
      if (e.currentTarget instanceof HTMLButtonElement) e.currentTarget.blur();
    },
    // note that player.canvas may not have loaded yet
    [domElement, setEnabled],
  );

  useKeyboardShortcut(shortcuts, toggleCaptions);

  if (playback.textTracks.length === 0) {
    return null;
  }

  return render(
    { enabled },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: clsx(
        "lv-controls-captions-toggle lv-controls-button",
        className,
      ),
      onClick: toggleCaptions,
    },
  );
}
