/** Promisifed version of [canplay](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canplay_event) event */
export function awaitMediaCanPlay(media: HTMLMediaElement): Promise<void> {
  return new Promise((resolve) => {
    if (media.readyState === media.HAVE_FUTURE_DATA) {
      return resolve();
    } else {
      media.addEventListener("canplay", () => resolve());
    }
  });
}

/** Promisified version of [`canplaythrough`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canplaythrough_event) event. */
export function awaitMediaCanPlayThrough(
  media: HTMLMediaElement
): Promise<void> {
  return new Promise((resolve) => {
    if (media.readyState === media.HAVE_ENOUGH_DATA) {
      return resolve();
    } else {
      media.addEventListener("canplaythrough", () => resolve());
    }
  });
}
