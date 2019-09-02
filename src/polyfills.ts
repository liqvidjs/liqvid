const id = <T>(_: T) => _;

export const fullscreenEnabled: boolean =
  ["fullscreenEnabled", "webkitFullscreenEnabled", "mozFullScreenEnabled", "msFullscreenEnabled"]
  .map(_ => document[_])
  .concat(false)
  .find(_ => _ !== undefined);

export const requestFullScreen: () => Promise<void> =
  ["requestFullscreen", "webkitRequestFullscreen", "mozRequestFullScreen", "msRequestFullscreen"]
  .map(_ => document.body[_])
  .concat(() => {})
  .find(id)
  .bind(document.body);

export const exitFullScreen: () => Promise<void> =
  ["exitFullscreen", "webkitExitFullscreen", "mozCancelFullScreen", "msExitFullscreen"]
  .map(_ => document[_])
  .concat(async () => {})
  .find(id)
  .bind(document);

export const isFullScreen = () =>
  ["fullscreen", "webkitIsFullScreen", "mozFullScreen"]
  .map(_ => document[_] as boolean)
  .find(_ => _ !== undefined);

export function onFullScreenChange(callback: EventListener) {
  for (const event of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"])
    document.addEventListener(event, callback);
}
