import { useEffect, useState } from "react";

/**
 * Whether loading is currently held back while a promise resolves.
 *
 * Returns `false` immediately when no promise is provided. When one is,
 * loading stays held back (returns `true`) until the promise resolves.
 * Gate network requests and media loading with this, e.g. for media that
 * is currently offscreen.
 */
export function useLoadHold(defer?: Promise<void>): boolean {
  const [held, setHeld] = useState(Boolean(defer));

  useEffect(() => {
    if (defer) {
      let active = true;
      setHeld(true);
      defer.then(() => {
        if (active) setHeld(false);
      });
      return () => {
        active = false;
      };
    }
  }, [defer]);

  return held;
}
