import {isClient} from "./utils/rsc";
const id = <T>(_: T) => _;

export const fullscreenEnabled: boolean = isClient
  ? [
      "fullscreenEnabled",
      "webkitFullscreenEnabled",
      "mozFullScreenEnabled",
      "msFullscreenEnabled",
    ]
      .map((_) => document[_])
      .concat(false)
      .find((_) => _ !== undefined)
  : false;

export const requestFullScreen: () => Promise<void> = isClient
  ? [
      "requestFullscreen",
      "webkitRequestFullscreen",
      "mozRequestFullScreen",
      "msRequestFullscreen",
    ]
      .map((_) => document.body[_])
      .concat(() => {})
      .find(id)
      .bind(document.body)
  : async () => {};

export const exitFullScreen: () => Promise<void> = isClient
  ? [
      "exitFullscreen",
      "webkitExitFullscreen",
      "mozCancelFullScreen",
      "msExitFullscreen",
    ]
      .map((_) => document[_])
      .concat(async () => {})
      .find(id)
      .bind(document)
  : async () => {};

export const isFullScreen = () =>
  ["fullscreen", "webkitIsFullScreen", "mozFullScreen"]
    .map((_) => document[_] as boolean)
    .find((_) => _ !== undefined);

export function onFullScreenChange(callback: EventListener): void {
  for (const event of [
    "fullscreenchange",
    "webkitfullscreenchange",
    "mozfullscreenchange",
    "MSFullscreenChange",
  ])
    document.addEventListener(event, callback);
}
