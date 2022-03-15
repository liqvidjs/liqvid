import {createContext, useContext} from "react";
import {Keymap} from ".";

const symbol = Symbol.for("@lqv/keymap");

type GlobalThis = {
  [symbol]: React.Context<Keymap>;
}

if (!(symbol in globalThis)) {
  (globalThis as unknown as GlobalThis)[symbol] = createContext<Keymap>(null);
}

/**
 * {@link React.Context} used to access ambient Keymap
 */
export const KeymapContext = (globalThis as unknown as GlobalThis)[symbol];

/** Access the ambient {@link Keymap} */
export function useKeymap() {
  return useContext(KeymapContext);
}
