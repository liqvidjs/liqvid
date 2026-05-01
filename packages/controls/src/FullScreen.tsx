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
  const forceUpdate = useForceUpdate();

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
