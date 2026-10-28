"use client";

import { useSyncExternalStore } from "react";

import { isDevTimingEnabled, subscribeDevTiming } from "./dev-timing.mts";

export function useDevTimingEnabled(): boolean {
  return useSyncExternalStore(
    subscribeDevTiming,
    isDevTimingEnabled,
    () => false,
  );
}
