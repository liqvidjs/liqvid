import type { KeyBinding } from "@codemirror/view";
import { Keymap } from "@liqvid/keymap";

/**
 * Handle key sequences in `seqs` even if key capture is suspended.
 * @param keymap {@link Keymap} to handle key sequences.
 * @param seqs Key sequences to handle.
 */
export function passThrough(keymap: Keymap, seqs: string[] = []): KeyBinding[] {
  return seqs.map((key) => {
    const can = cm2lv(key);

    // argh
    const fake =
      typeof window === "undefined" ? null : new KeyboardEvent("keydown");

    return {
      key,
      run: () => {
        const handlers = keymap.getHandlers(can);
        for (const cb of handlers) {
          cb(fake);
        }
        return false;
      },
    } as KeyBinding;
  });
}

/**
 * Convert CodeMirror key sequences to Liqvid format.
 */
function cm2lv(seq: string): string {
  const isMac =
    typeof globalThis.navigator !== "undefined" &&
    navigator.platform === "MacIntel";
  seq = seq.replace("Mod", isMac ? "Meta" : "Ctrl");
  seq = seq.replace(/-/g, "+");
  return Keymap.normalize(seq);
}
