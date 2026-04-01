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

    return {
      key,
      run: () => {
        const handlers = keymap.getHandlers(can);
        for (const cb of handlers) {
          cb(fakeKeyboardEvent(can), { seq: key });
        }
        return false;
      },
    } as KeyBinding;
  });
}

function fakeKeyboardEvent(seq: string) {
  return new KeyboardEvent("keydown", {
    altKey: seq.includes("Alt"),
    ctrlKey: seq.includes("Ctrl") || (!isMac && seq.includes("Mod")),
    metaKey: seq.includes("Meta") || (isMac && seq.includes("Mod")),
    shiftKey: seq.includes("Shift"),
  });
}

/**
 * Convert CodeMirror key sequences to Liqvid format.
 */
export function cm2lv(seq: string): string {
  seq = seq.replace("Mod", isMac ? "Meta" : "Ctrl");
  seq = seq.replace(/-/g, "+");
  return Keymap.normalize(seq);
}

/**
 * Convert Liqvid key sequences to CodeMirror format.
 */
export function lv2cm(seq: string): string {
  seq = seq.replace(/\+/g, "-");
  return seq;
}

const isMac =
  typeof globalThis.navigator !== "undefined" &&
  navigator.platform === "MacIntel";
