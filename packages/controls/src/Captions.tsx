"use client";

import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { usePlayback } from "@liqvid/playback/react";
import { usePlayer } from "@liqvid/player";
import { onClickReact } from "@liqvid/utils";
import classNames from "classnames";
import { useCallback, useMemo, useState } from "react";

import { convertShortcuts } from "./utils";

export type CaptionsToggleProps = {
  className?: string;
  render: (
    state: {
      enabled: boolean;
    },
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  shortcuts?: string | string[];
};

/** Captions control. */
export function CaptionsToggle({
  className,
  render,
  shortcuts,
}: CaptionsToggleProps) {
  const { domElement } = usePlayer();
  const playback = usePlayback();
  const [enabled, setEnabled] = useState(false);

  const toggleCaptions = useCallback(
    (
      e:
        | KeyboardEvent
        | React.MouseEvent<HTMLButtonElement>
        | React.TouchEvent<HTMLButtonElement>,
    ) => {
      domElement?.classList.toggle("lv-captions");

      // blur or keyboard controls will get snagged
      if (e.currentTarget instanceof HTMLButtonElement) e.currentTarget.blur();
    },
    // note that player.canvas may not have loaded yet
    [domElement],
  );

  useKeyboardShortcut(shortcuts, toggleCaptions);

  const events = useMemo(() => onClickReact(toggleCaptions), [toggleCaptions]);

  if (playback.textTracks.length === 0) {
    return null;
  }

  return render(
    { enabled },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: classNames(
        "lv-controls-captions-toggle lv-controls-button",
        className,
      ),
      ...events,
    },
  );
}
