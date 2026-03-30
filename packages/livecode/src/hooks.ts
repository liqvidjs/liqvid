"use client";

import type { Command } from "@codemirror/view";
import { useEffect } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { useLiveCodeStore } from "./store";

/** subscribe to the active file */
export function useActiveFile() {
  return useStore(
    useLiveCodeStore(),
    useShallow((state) => {
      const { activeGroup, groups } = state;
      if (!activeGroup) return null;

      // TODO: this is inefficient
      const group = groups[activeGroup];
      return group.files.find((f) => f.filename === group.activeFile);
    }),
  );
}

/** add a keyboard shortcut */
export function useLiveCodeShortcut(
  shortcut: string | undefined,
  action: Command,
) {
  const { setState: setStoreState } = useLiveCodeStore();

  useEffect(() => {
    if (!shortcut) return;

    setStoreState((prev) => ({
      shortcuts: {
        ...prev.shortcuts,
        [shortcut]: {
          key: shortcut,
          run: action,
        },
      },
    }));

    return () => {
      setStoreState((prev) => ({
        shortcuts: Object.fromEntries(
          Object.entries(prev.shortcuts).filter(([key]) => key !== shortcut),
        ),
      }));
    };
  }, [shortcut, setStoreState, action]);
}
