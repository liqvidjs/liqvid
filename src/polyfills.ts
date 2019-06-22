export function requestFullScreen(): void {
  for (const method of ["requestFullscreen", "webkitRequestFullscreen", "mozRequestFullScreen", "msRequestFullscreen"])
    if (document.body[method])
      return document.body[method]();
}

export function exitFullScreen(): void {
  for (const method of ["exitFullscreen", "webkitExitFullscreen", "mozCancelFullScreen", "msExitFullscreen"])
    if (document[method])
      return document[method]();
}

export function isFullScreen(): boolean {
  for (const prop of ["fullscreen", "webkitIsFullScreen", "mozFullScreen"])
    if (document[prop] !== undefined)
      return document[prop];
}

export function onFullScreenChange(callback: EventListener) {
  for (const event of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"])
    document.addEventListener(event, callback);
}
