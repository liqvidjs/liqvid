import {mixedCaseVals} from "./mixedCaseVals";

type Callback = (e: KeyboardEvent) => void;

interface Bindings {
  [key: string]: Callback[];
}

const modifierMap = {
  Control: "Ctrl",
  Alt: "Alt",
  Shift: "Shift",
  Meta: "Meta"
};

const mixedCase: {[key: string]: string} = {};
for (const key of mixedCaseVals) {
  mixedCase[key.toLowerCase()] = key;
}

const modifierOrder = (Object.keys(modifierMap) as (keyof typeof modifierMap)[]).map(k => modifierMap[k]);

const useCode = [
  "Backspace",
  "Enter",
  "Space",
  "Tab"
];

/** Maps keyboard shortcuts to actions */
export class Keymap {
  private __bindings: Bindings;

  constructor() {
    this.__bindings = {};
  }

  /** Given a KeyboardEvent, returns a shortcut sequence matching that event. */
  static identify(e: KeyboardEvent) {
    const parts: string[] = [];
    for (const modifier in modifierMap) {
      if (e.getModifierState(modifier)) {
        parts.push(modifierMap[modifier as keyof typeof modifierMap]);
      }
    }
    if (e.key in modifierMap) {
    } else if (e.code.startsWith("Digit")) {
      parts.push(e.code.slice(5));
    } else if (e.code.startsWith("Key")) {
      parts.push(e.code.slice(3));
    } else if (useCode.includes(e.code)) {
      parts.push(e.code);
    } else {
      parts.push(e.key);
    }
    return parts.join("+");
  }

  /** Returns a canonical form of the shortcut sequence. */
  static normalize(seq: string) {
    return seq.split("+").map(str => {
      const lower = str.toLowerCase();

      if (str === "")
        return "";

      if (mixedCase[lower]) {
        return mixedCase[lower];
      }

      return str[0].toUpperCase() + lower.slice(1);
    }).sort((a, b) => {
      if (modifierOrder.includes(a)) {
        if (modifierOrder.includes(b)) {
          return modifierOrder.indexOf(a) - modifierOrder.indexOf(b);
        } else {
          return -1;
        }
      } else if (modifierOrder.includes(b)) {
        return 1;
      } else {
        return cmp(a, b);
      }
    }).join("+");
  }

  /**
   * Bind a handler to be called when the shortcut sequence is pressed.
   * @param seq Shortcut sequence
   * @param cb Callback function
   */
  bind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.bind(atomic, cb);
      }
      return;
    }
    seq = Keymap.normalize(seq);
    if (!this.__bindings.hasOwnProperty(seq)) {
      this.__bindings[seq] = [];
    }
    this.__bindings[seq].push(cb);
  }

  /**
   * Unbind a handler from a shortcut sequence.
   * @param seq Shortcut sequence
   * @param cb Handler to unbind
   */
  unbind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.unbind(atomic, cb);
      }
      return;
    }
    seq = Keymap.normalize(seq);
    if (!this.__bindings.hasOwnProperty(seq))
      throw new Error(`${seq} is not bound`);
    const index = this.__bindings[seq].indexOf(cb);
    if (index < 0) {
      throw new Error(`${seq} is not bound to ${cb.name ?? "callback"}`);
    }
    this.__bindings[seq].splice(index, 1);
    if (this.__bindings[seq].length === 0) {
      delete this.__bindings[seq];
    }
  }

  /** Return all shortcut sequences with handlers bound to them. */
  getKeys() {
    return Object.keys(this.__bindings);
  }

  /** Get the list of handlers for a given shortcut sequence. */
  getHandlers(seq: string) {
    if (!this.__bindings.hasOwnProperty(seq))
      return [];
    return this.__bindings[seq].slice();
  }
  
  /** Dispatches all handlers matching the given event. */
  handle(e: KeyboardEvent) {
    const seq = Keymap.identify(e);

    if (!this.__bindings[seq] && !this.__bindings["*"])
      return;

    if (this.__bindings[seq]) {
      e.preventDefault();
      
      for (const cb of this.__bindings[seq]) {
        cb(e);
      }
    }

    if (this.__bindings["*"]) {
      for (const cb of this.__bindings["*"]) {
        cb(e);
      }
    }
  }
}

/**
 * Returns -1 if a < b, 0 if a === b, and 1 if a > b.
 */
function cmp<T>(a: T, b: T) {
  if (a < b)
    return -1;
  else if (a === b)
    return 0;
  return 1;
}
