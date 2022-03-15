import {
  fullscreenEnabled,
  requestFullScreen as $requestFullScreen,
  exitFullScreen as $exitFullScreen,
  isFullScreen as $isFullScreen,
  onFullScreenChange as $onFullScreenChange
} from "./polyfills";

let __isFullScreen = false;
const __callbacks: (() => void)[] = [];

export const requestFullScreen = fullscreenEnabled ? $requestFullScreen : (): void => {
  window.parent.postMessage({type: "fake-fullscreen", value: true}, window.parent.origin);

  if (!__isFullScreen) {
    __isFullScreen = true;
    for (const _ of __callbacks) _();
  }
};

export const exitFullScreen = fullscreenEnabled ? $exitFullScreen : (): void => {
  window.parent.postMessage({type: "fake-fullscreen", value: false}, window.parent.origin);

  if (__isFullScreen) {
    __isFullScreen = false;
    for (const _ of __callbacks) _();
  }
};

export const isFullScreen = fullscreenEnabled ? $isFullScreen : (): boolean => {
  return __isFullScreen;
};

export const onFullScreenChange = fullscreenEnabled ? $onFullScreenChange : (callback: () => void): void => {
  __callbacks.push(callback);
};
