import * as React from "react";
import {useEffect} from "react";
import {
  exitFullScreen,
  isFullScreen,
  onFullScreenChange,
  requestFullScreen,
} from "../fake-fullscreen";
import {strings} from "../i18n";
import {onClick, useForceUpdate} from "@liqvid/utils/react";
import {useKeymap} from "@liqvid/keymap/react";

const toggleFullScreen = () =>
  isFullScreen() ? exitFullScreen() : requestFullScreen();
const events = onClick(toggleFullScreen);

/** Fullscreen control */
export function FullScreen() {
  const keymap = useKeymap();
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    // listener
    onFullScreenChange(forceUpdate);

    // keyboard shortcut
    keymap.bind("F", toggleFullScreen);

    return () => {
      keymap.unbind("F", toggleFullScreen);
    };
  }, [forceUpdate, keymap]);

  const full = isFullScreen();
  const label =
    (full ? strings.EXIT_FULL_SCREEN : strings.ENTER_FULL_SCREEN) + " (f)";

  return (
    <button
      className="lv-controls-fullscreen"
      aria-label={label}
      title={label}
      {...events}
    >
      <svg viewBox="0 0 36 36">
        {full ? exitFullScreenIcon : enterFullScreenIcon}
      </svg>
    </button>
  );
}

/** Icon to exit full screen */
const exitFullScreenIcon = (
  <>
    <path fill="white" d="M 14 14 h -4 v 2 h 6 v -6 h -2 v 4 z" />
    <path fill="white" d="M 22 14 v -4 h -2 v 6 h 6 v -2 h -4 z" />
    <path fill="white" d="M 20 26 h 2 v -4 h 4 v -2 h -6 v 6 z" />
    <path fill="white" d="M 10 22 h 4 v 4 h 2 v -6 h -6 v 2 z" />
  </>
);

/** Icon to enter full screen */
const enterFullScreenIcon = (
  <>
    <path fill="white" d="M 10 16 h 2 v -4 h 4 v -2 h -6 v 6 z" />
    <path fill="white" d="M 20 10 v 2 h 4 v 4 h 2 v -6 h -6 z" />
    <path fill="white" d="M 24 24 h -4 v 2 h 6 v -6 h -2 v 4 z" />
    <path fill="white" d="M 12 20 h -2 v 6 h 6 v -2 h -4 v -4 z" />
  </>
);
