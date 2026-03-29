"use client";

import { useLiveCodeStore } from "@lqv/livecode";
import { useStore } from "zustand";

/** Component for displaying console logs. */
export function Console({ className }: { className?: string }) {
  const store = useLiveCodeStore();
  const messages = useStore(store, (state) => state.messages);

  return <output className={className}>{messages}</output>;
}
