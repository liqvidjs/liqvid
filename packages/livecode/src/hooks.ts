"use client";

import type { Command } from "@codemirror/view";
import { useEffect } from "react";

import { useLiveCodeStore } from "./store";

/* add keyboard shortcuts */
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
