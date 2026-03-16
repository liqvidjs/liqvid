"use client";

import { useKeymap } from "@liqvid/keymap/react";
import { onClickReact, useForceUpdate } from "@liqvid/utils";
import classNames from "classnames";
import { useEffect } from "react";

import {
  exitFullScreen,
  isFullScreen,
  onFullScreenChange,
  requestFullScreen,
} from "./fake-fullscreen";
import { convertShortcuts } from "./utils";

const toggleFullScreen = () =>
  isFullScreen() ? exitFullScreen() : requestFullScreen();
const events = onClickReact(toggleFullScreen);

interface FullScreenControlProps {
  className?: string;
  render: (
    state: {
      isFullScreen: boolean;
    },
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  shortcuts?: string | string[];
}

/** Fullscreen control */
export function FullScreen({
  className,
  render,
  shortcuts,
}: FullScreenControlProps) {
  const keymap = useKeymap();
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    // listener
    onFullScreenChange(forceUpdate);

    // keyboard shortcut
    for (const seq of shortcuts ?? []) {
      keymap.bind(seq, toggleFullScreen);
    }

    return () => {
      for (const seq of shortcuts ?? []) {
        keymap.unbind(seq, toggleFullScreen);
      }
    };
  }, [forceUpdate, keymap, shortcuts]);

  return render(
    { isFullScreen: isFullScreen() ?? false },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: classNames(
        "lv-controls-fullscreen lv-controls-button",
        className,
      ),
      ...events,
    },
  );
}
