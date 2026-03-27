"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

import { Keymap, type ShortcutHandler } from "./index.mjs";

const symbol = Symbol.for("@lqv/keymap");

type GlobalThis = {
  [symbol]: React.Context<Keymap | null>;
};

if (!(symbol in globalThis)) {
  (globalThis as unknown as GlobalThis)[symbol] = createContext<Keymap | null>(
    null,
  );
}

/**
 * {@link React.Context} used to access ambient Keymap
 */
export const KeymapContext = (globalThis as unknown as GlobalThis)[symbol];
KeymapContext.displayName = "Keymap";

/** Access the ambient {@link Keymap} */
export function useKeymap() {
  const keymap = useKeymapOptional();
  if (!keymap) throw new Error("no ambient Keymap available");
  return keymap;
}

/**
 * Access the ambient {@link Keymap}, or null if none available.
 */
export function useKeymapOptional(): Keymap | null {
  return useContext(KeymapContext);
}

/** Register a keyboard shortcut for the duration of the component. */
export function useKeyboardShortcut(
  /**
   * Keyboard sequence(s) to bind to.
   * If `undefined` or `null` are passed, nothing happens.
   */
  seqOrSeqs: string | string[] | undefined | null,

  /** Callback to handle the shortcut */
  callback: ShortcutHandler,
) {
  const keymap = useKeymap();

  useEffect(() => {
    if (!seqOrSeqs) {
      return;
    }

    keymap.bind(seqOrSeqs, callback);
    return () => {
      keymap.unbind(seqOrSeqs, callback);
    };
  }, [callback, keymap, seqOrSeqs]);
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

export function KeymapProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
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
