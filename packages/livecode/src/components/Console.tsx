"use client";

import { useStore } from "zustand";

import { useLiveCodeStore } from "../store.ts";

/** Component for displaying console logs. */
export function Console({ className }: { className?: string }) {
  const store = useLiveCodeStore();
  const messages = useStore(store, (state) => state.messages);

  return <output className={className}>{messages}</output>;
}
