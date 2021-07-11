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

const modifierOrder = (Object.keys(modifierMap) as (keyof typeof modifierMap)[]).map(k => modifierMap[k])

const useCode = [
  "Backspace",
  "Enter",
  "Space",
  "Tab"
];

export class KeyMap {
  #bindings: Bindings;

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

  constructor() {
    this.#bindings = {};
  }

  bind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.bind(atomic, cb);
      }
      return;
    }
    seq = KeyMap.normalize(seq);
    if (!this.#bindings.hasOwnProperty(seq)) {
      this.#bindings[seq] = [];
    }
    this.#bindings[seq].push(cb);
  }

  unbind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.unbind(atomic, cb);
      }
      return;
    }
    seq = KeyMap.normalize(seq);
    if (!this.#bindings.hasOwnProperty(seq))
      throw new Error(`${seq} is not bound`);
    const index = this.#bindings[seq].indexOf(cb);
    if (index < 0) {
      throw new Error(`${seq} is not bound to ${cb.name ?? "callback"}`);
    }
    this.#bindings[seq].splice(index, 1);
    if (this.#bindings[seq].length === 0) {
      delete this.#bindings[seq];
    }
  }

  getKeys() {
    return Object.keys(this.#bindings);
  }

  getHandlers(seq: string) {
    if (!this.#bindings.hasOwnProperty(seq))
      return [];
    return this.#bindings[seq].slice();
  }

  handle(e: KeyboardEvent) {
    let defaultPrevented = false;
    const seq = KeyMap.identify(e);

    if (!this.#bindings[seq] && !this.#bindings["*"])
      return;

    if (defaultPrevented) {
      e.preventDefault();
      defaultPrevented = true;
    }

    if (this.#bindings[seq]) {
      for (const cb of this.#bindings[seq]) {
        cb(e);
      }
    }

    if (this.#bindings["*"]) {
      for (const cb of this.#bindings["*"]) {
        cb(e);
      }
    }
  }
}

function titlecase(str: string) {
  if (str === "")
    return "";
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

function cmp(a: unknown, b: unknown) {
  if (a < b)
    return -1;
  else if (a === b)
    return 0;
  return 1;
}
