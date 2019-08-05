import {
  fullscreenEnabled,
  requestFullScreen as $requestFullScreen,
  exitFullScreen as $exitFullScreen,
  isFullScreen as $isFullScreen,
  onFullScreenChange as $onFullScreenChange
} from "./polyfills";

let __isFullScreen = false;
const __callbacks: (() => {})[] = [];

export const requestFullScreen = fullscreenEnabled ? $requestFullScreen : () => {
  window.parent.postMessage({type: "fake-fullscreen", value: true}, location.origin);

  if (!__isFullScreen) {
    for (let _ of __callbacks) _();
  }

  __isFullScreen = true;
};

export const exitFullScreen = fullscreenEnabled ? $exitFullScreen : () => {
  window.parent.postMessage({type: "fake-fullscreen", value: false}, location.origin);

  if (__isFullScreen) {
    for (let _ of __callbacks) _();
  }

  __isFullScreen = false;
};

export const isFullScreen = fullscreenEnabled ? $isFullScreen : () => {
  return __isFullScreen;
};

export const onFullScreenChange = fullscreenEnabled ? $onFullScreenChange : (callback: () => {}) => {
  __callbacks.push(callback);
};
