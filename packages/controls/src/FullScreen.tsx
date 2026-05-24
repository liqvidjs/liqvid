"use client";

import { useKeyboardShortcut } from "@liqvid/keymap/react";
import { onClickReact, useForceUpdate } from "@liqvid/utils";
import clsx from "clsx";
import { useEffect } from "react";

import {
  exitFullScreen,
  isFullScreen,
  onFullScreenChange,
  requestFullScreen,
} from "./fake-fullscreen.ts";
import { convertShortcuts } from "./utils.ts";

type FullScreenControlProps = FullscreenOptions & {
  className?: string;
  // not in lib.dom.d.ts yet
  keyboardLock?: "browser" | "none";
  render: (
    state: {
      isFullScreen: boolean;
    },
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  shortcuts?: string | string[];
};

/** Fullscreen control */
export function FullScreen({
  className,
  render,
  shortcuts,
  ...options
}: FullScreenControlProps) {
  const forceUpdate = useForceUpdate();

  const toggleFullScreen = () => {
    return isFullScreen() ? exitFullScreen() : requestFullScreen(options);
  };

  const events = onClickReact(toggleFullScreen);

  useKeyboardShortcut(shortcuts, toggleFullScreen);

  useEffect(() => {
    // listener
    // TODO: remove listener
    onFullScreenChange(forceUpdate);
  }, [forceUpdate]);

  return render(
    { isFullScreen: isFullScreen() ?? false },
    {
      "aria-keyshortcuts": convertShortcuts(shortcuts),
      className: clsx("lv-controls-fullscreen lv-controls-button", className),
      ...events,
    },
  );
}
