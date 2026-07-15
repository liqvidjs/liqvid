/**
 * Inject variables into global scope for debugging.
 * @deprecated do not use this in production code, only for debugging purposes
 * @example
 *
 * const playback = usePlayback();
 * injectGlobal({ playback });
 * // can now use `playback` in the browser console
 */
export function injectGlobal(obj: Record<string, unknown>) {
  if (globalThis?.window) {
    Object.assign(globalThis?.window, obj);
  }
}
