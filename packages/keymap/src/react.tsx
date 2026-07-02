"use client";

import { makeContext } from "@liqvid/utils";
import { useEffect, useEffectEvent, useMemo } from "react";

import {
  Keymap,
  type ShortcutHandler,
  type ShortcutsSpecifier,
} from "./index.mts";

const KeymapContext = makeContext<Keymap | undefined>({
  defaultValue: undefined,
  name: "Keymap",
  uniqueKey: "@liqvid/keymap",
});

/** Access the ambient {@link Keymap} */
export const useKeymap = KeymapContext.use;

/**
 * Access the ambient {@link Keymap}, or undefined if none available.
 */
export const useKeymapOptional = KeymapContext.useOptional;

/** Register a keyboard shortcut for the duration of the component. */
export function useKeyboardShortcut(
  /**
   * Keyboard sequence(s) to bind to.
   * If `undefined` or `null` are passed, nothing happens.
   */
  seqOrSeqs: ShortcutsSpecifier | undefined | null,

  /** Callback to handle the shortcut */
  callback: ShortcutHandler,
) {
  const keymap = useKeymap();

  const listener = useEffectEvent<ShortcutHandler>((...args) => {
    callback(...args);
  });

  useEffect(() => {
    if (!seqOrSeqs) {
      return;
    }

    keymap.bind(seqOrSeqs, listener);

    return () => {
      keymap.unbind(seqOrSeqs, listener);
    };
  }, [keymap, seqOrSeqs]);
}

/**
 * Determine whether a keyboard event should be handled by the keymap.
 * Returns false for events targeting elements with `data-affords="keys"`,
 * unless a modifier key (Alt, Ctrl, Meta) is pressed.
 */
function shouldHandleEvent(e: KeyboardEvent): boolean {
  // always handle if modifier keys are pressed
  if (e.altKey || e.ctrlKey || e.metaKey) return true;

  // always handle if no target
  if (!e.target) return true;

  // don't handle if target has data-affords="keys" attribute
  if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
    if (e.target.closest(`*[data-affords~="keys"]`)) {
      return false;
    }
  }

  return true;
}

export function KeymapProvider({ children }: { children?: React.ReactNode }) {
  const ambientKeymap = useKeymapOptional();
  const keymap = useMemo(() => ambientKeymap ?? new Keymap(), [ambientKeymap]);

  useEffect(() => {
    // subscriptions already set up
    if (ambientKeymap) return;

    function handle(e: KeyboardEvent) {
      if (shouldHandleEvent(e)) {
        keymap.handle(e);
      }
    }

    document.body.addEventListener("keydown", handle);

    return () => {
      document.body.removeEventListener("keydown", handle);
    };
  }, [keymap, ambientKeymap]);

  return (
    <KeymapContext.Provider value={keymap}>{children}</KeymapContext.Provider>
  );
}
