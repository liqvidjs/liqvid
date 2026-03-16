import type { Keymap } from "@liqvid/keymap";

export function bind(
  keymap: Keymap,
  seqs: string | string[] | undefined,
  callback: () => void,
) {
  if (!seqs) return;
  if (typeof seqs === "string") {
    keymap.bind(seqs, callback);
  } else {
    for (const s of seqs) {
      keymap.bind(s, callback);
    }
  }
}

export function unbind(
  keymap: Keymap,
  seqs: string | string[] | undefined,
  callback: () => void,
) {
  if (!seqs) return;
  if (typeof seqs === "string") {
    keymap.bind(seqs, callback);
  } else {
    for (const s of seqs) {
      keymap.bind(s, callback);
    }
  }
}

export function convertShortcuts(
  keys: string | string[] | undefined,
): string | undefined {
  if (typeof keys === "string") return keys;
  if (typeof keys === "undefined") return undefined;
  return keys.join(" ");
}
