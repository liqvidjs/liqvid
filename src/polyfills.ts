export function requestFullScreen(): void {
  for (const method of ['webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'])
    if (document.body[method])
      return document.body[method]();
}

export function exitFullScreen(): void {
  for (const method of ['webkitExitFullscreen', 'mozCancelFullScreen', 'msExitFullscreen'])
    if (document[method])
      return document[method]();
}

export function isFullScreen(): boolean {
  for (const prop of ['webkitIsFullScreen', 'mozFullScreen'])
    if (document[prop] !== undefined)
      return document[prop];
}

export function onFullScreenChange(callback: EventListener) {
  for (const event of ['webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'])
    document.addEventListener(event, callback);
}
