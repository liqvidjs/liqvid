// wait for media to load
export function awaitMediaCanPlay(media: HTMLMediaElement): Promise<void> {
  return new Promise((resolve) => {
    if (media.readyState === media.HAVE_FUTURE_DATA) {
      return resolve();
    }
    else {
      media.addEventListener("canplay", () => resolve());
    }
  });
}

export function awaitMediaCanPlayThrough(media: HTMLMediaElement): Promise<void> {
  return new Promise((resolve) => {
    if (media.readyState === media.HAVE_ENOUGH_DATA) {
      return resolve();
    }
    else {
      media.addEventListener("canplaythrough", () => resolve());
    }
  });
}
