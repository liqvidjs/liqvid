"use client";

import { createContext, useContext, useEffect, useRef } from "react";

import { Keymap, type ShortcutHandler } from "./index.mts";

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

export function KeymapProvider({
  children,
  shouldHandle,
  value: propsKeymap,
}: {
  children?: React.ReactNode;

  /**
   * Callback to indicate whether shortcuts should be handled.
   * If not specified, shortcuts are always handled.
   */
  shouldHandle?: (e: KeyboardEvent) => boolean;

  value?: Keymap | null;
}) {
  const ownKeymap = useRef<Keymap>(null);
  if (!propsKeymap && !ownKeymap.current) {
    ownKeymap.current = new Keymap();
  }
  const keymap = propsKeymap ?? ownKeymap.current!;

  const savedShouldHandle = useRef(shouldHandle);

  // allow consumers to omit useCallback without messing up the other useEffect
  useEffect(() => {
    savedShouldHandle.current = shouldHandle;
  }, [shouldHandle]);

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (savedShouldHandle.current?.(e) ?? true) {
        keymap.handle(e);
      }
    }

    document.body.addEventListener("keydown", handle);

    return () => {
      document.body.removeEventListener("keydown", handle);
    };
  }, [keymap]);

  return (
    <KeymapContext.Provider value={keymap}>{children}</KeymapContext.Provider>
  );
}
