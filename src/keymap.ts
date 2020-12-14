type Callback = (e: KeyboardEvent) => void;

interface Bindings {
  [key: string]: Callback[];
}

interface ModifierMap {

}

export default class KeyMap {
  keys: Bindings;

  static matches(seq: string, e: KeyboardEvent) {
    if (e.altKey || e.metaKey || e.ctrlKey)
      return false;

    // universal match
    if (seq === "*")
      return true;

    if (seq === e.key.toLowerCase())
      return true;
  }

  constructor() {
    this.keys = {};
  }

  bind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.bind(atomic, cb);
      }
    }
    if (!this.keys.hasOwnProperty(seq)) {
      this.keys[seq] = [];
    }
    this.keys[seq].push(cb);
  }

  unbind(seq: string, cb: Callback) {
    if (seq.indexOf(",") > -1) {
      for (const atomic of seq.split(",")) {
        this.unbind(atomic, cb);
      }
    }
    if (!this.keys.hasOwnProperty(seq))
      throw new Error();
    const index = this.keys[seq].indexOf(cb);
    if (index < 0)
      throw new Error();
    this.keys[seq].splice(index, 1);
  }

  getKeys() {
    return Object.keys(this.keys);
  }

  getHandlers(seq: string) {
    if (!this.keys.hasOwnProperty(seq))
      throw new Error();
    return this.keys[seq].slice();
  }

  handle(e: KeyboardEvent) {
    let defaultPrevented = false;

    for (const seq in this.keys) {
      if (KeyMap.matches(seq, e)) {
        if (defaultPrevented) {
          e.preventDefault();
          defaultPrevented = true;
        }

        for (const cb of this.keys[seq]) {
          cb(e);
        }
      }
    }
  }
}

function getModifiers(e: KeyboardEvent) {

}
