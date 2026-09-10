import { Duration, type DurationLike } from "@liqvid/duration";

import { useStable } from "./react.ts";

/**
 * Get a referentially stable {@link Duration} object from a {@link DurationLike} value.
 */
export function useStableDuration<T extends DurationLike | undefined>(
  value: T,
): T extends undefined ? Duration | undefined : Duration {
  type Post = T extends undefined ? Duration | undefined : Duration;
  return useStable(
    value,
    (a, b) => {
      if (a) {
        if (b) {
          return a.equals(b);
        }

        return false;
      }

      return (a as undefined) === b;
    },
    (v) => (v ? Duration.from(v) : undefined) as Post,
  ) as Post;
}
