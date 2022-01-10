import {createContext, useContext} from "react";
import {Keymap} from ".";

/**
 * {@link React.Context} used to access ambient Keymap
 */
export const KeymapContext = createContext<Keymap>(null);

/** Access the ambient {@link Keymap} */
export function useKeymap() {
  return useContext(KeymapContext);
}
