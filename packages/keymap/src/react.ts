import {createContext, useContext, useEffect} from "react";
import type {Keymap} from ".";

const symbol = Symbol.for("@lqv/keymap");

type GlobalThis = {
  [symbol]: React.Context<Keymap>;
};

if (!(symbol in globalThis)) {
  (globalThis as unknown as GlobalThis)[symbol] = createContext<Keymap>(null);
}

/**
 * {@link React.Context} used to access ambient Keymap
 */
export const KeymapContext = (globalThis as unknown as GlobalThis)[symbol];
KeymapContext.displayName = "Keymap";

/** Access the ambient {@link Keymap} */
export function useKeymap() {
  return useContext(KeymapContext);
}

/** Register a keyboard shortcut for the duration of the component. */
export function useKeyboardShortcut(
  /** Keyboard sequence to bind to */
  seq: string,

  /** Callback to handle the shortcut */
  callback: (e: KeyboardEvent) => unknown
) {
  const keymap = useKeymap();

  useEffect(() => {
    keymap.bind(seq, callback);

    return () => keymap.unbind(seq, callback);
  }, [callback, keymap, seq]);
}
