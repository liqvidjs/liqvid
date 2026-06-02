import { IS_CLIENT } from "@liqvid/ssr";
import { useEffect, useId } from "react";

import type { Playback } from "./Playback.mts";

const sym = Symbol.for("@liqvid/hooks/useEager");

export function useEager(callback: () => void, playback: Playback | undefined) {
  const id = useId();
  const global = globalThis as { [sym: symbol]: Map<string, Set<Playback>> };

  useEffect(() => {
    return () => {
      if (!playback) return;

      const globalInstances = global[sym]!;
      const componentInstances = globalInstances.get(id);

      componentInstances?.delete(playback);
      if (componentInstances?.size === 0) {
        globalInstances?.delete(id);
      }
    };
  }, [id, playback]);

  if (IS_CLIENT && playback) {
    global[sym] ??= new Map();
    if (!global[sym].has(id)) {
      global[sym].set(id, new Set());
    }
    const set = global[sym]!.get(id)!;
    if (!set.has(playback)) {
      set.add(playback);
      callback();
    }
  }
}
