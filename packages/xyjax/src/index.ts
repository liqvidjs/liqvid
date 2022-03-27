/**
  XyJax shenanigans
*/

import {lerp} from "@liqvid/utils/misc";
import {usePlayback, useTime} from "liqvid";
import {useCallback, useEffect, useRef} from "react";
import {Handle} from "@liqvid/mathjax";

interface Coords {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

/**
 * Animate XyJax arrows
 */
export function useAnimateArrows(o: {
  /** CSS selector for arrow head */
  head: string;

  /** CSS selector for arrow tail */
  tail: string;

  /** CSS selector for arrow label */
  label?: string;

  /** Reference to container {@link MJX} */
  ref: React.MutableRefObject<Handle>;

  /** Animation function for arrow tail */
  tailFn: (t: number) => number;

  /** Fade options for arrow head */
  headFade: KeyframeEffectOptions;

  /** Fade options for arrow label */
  labelFade: KeyframeEffectOptions;
}, deps?: React.DependencyList): void {
  const playback = usePlayback();
  const tail = useRef<SVGLineElement>();
  const init = useRef<Coords>({});

  /* fading function */
  const fadeTail = useCallback((u: number) => {
    if (!tail.current)
      return;

    const {x1, x2, y1, y2} = init.current;

    if (u === 0) {
      tail.current.style.opacity = "0";
    } else {
      tail.current.style.opacity = "1";
      tail.current.setAttribute("x2", lerp(x1, x2, u).toString());
      tail.current.setAttribute("y2", lerp(y1, y2, u).toString());
    }
  }, []);

  /* initialize */
  useEffect(() => {
    o.ref.current.ready.then(() => {
      /* tail animation */
      tail.current = o.ref.current.domElement.querySelector(o.tail);

      for (const key of ["x1", "y1", "x2", "y2"] as (keyof Coords)[]) {
        init.current[key] = parseFloat(tail.current.getAttribute(key));
      }

      fadeTail(o.tailFn(playback.currentTime));

      /* head animation */
      const headNodes = Array.from(o.ref.current.domElement.querySelectorAll(o.head));
      for (const head of headNodes) {
        playback.newAnimation([{opacity: 0}, {opacity: 1}], o.headFade)(head);
      }

      /* label animation */
      const labelNodes = Array.from(o.ref.current.domElement.querySelectorAll(o.label));
      for (const label of labelNodes) {
        playback.newAnimation([{opacity: 0}, {opacity: 1}], o.labelFade)(label);
      }
    });
  }, deps);

  // tail animation
  useTime(fadeTail, o.tailFn, deps);
}

// absolutely bonkers interception
let extended = false;
Object.defineProperty(MathJax, "AST", {
  get() {
    return this.__xypic;
  },

  set(value) {
    this.__xypic = value;
    if (!extended) {
      extendXY();
      extended = true;
    }
    return this.__xypic = value;
  }
});

export function extendXY(): void {
  const AST = MathJax.AST;
  const xypic = MathJax.xypicGlobalContext;
  const {modifierRepository} = xypic.repositories;

  /* inject ourselves into xypic */
  const prototype = AST.Modifier.Shape.Alphabets.prototype;

  const preprocess = prototype.preprocess.bind(prototype);
  prototype.preprocess = function (...args: unknown[]) {
    if (this.alphabets.startsWith("color")) {
      return modifierRepository.get("color").preprocess(...args);
    } else if (this.alphabets.startsWith("data")) {
      return modifierRepository.get("data").preprocess(...args);
    }
    return preprocess(...args);
  };

  const modifyShape = prototype.modifyShape.bind(prototype);
  prototype.modifyShape = function (...args: unknown[]) {
    if (this.alphabets.startsWith("color")) {
      const color = this.alphabets.substr("color".length);
      return modifierRepository.get("color").modifyShape(...args, color);
    } else if (this.alphabets.startsWith("data")) {
      const data = this.alphabets.substr("data".length);
      return modifierRepository.get("data").modifyShape(...args, data);
    }
    return modifyShape(...args);
  };

  // color
  modifierRepository.put("color", new class extends AST.Modifier.Shape.ChangeColor {
    modifyShape(context: unknown, objectShape: unknown, restModifiers: unknown, color: string) {
      this.colorName = xyDecodeColor(color);
      return super.modifyShape(context, objectShape, restModifiers);
    }
  });

  class ChangeDataShape {
    constructor(public data: string, public shape: any) {}

    draw(svg: any) {
      const g = svg.createGroup();
      Object.assign(g.drawArea.dataset, JSON.parse("{" + fromb52(this.data) + "}"));
      this.shape.draw(g);
    }

    getBoundingBox() {
      return this.shape.getBoundingBox();
    }
  }

  // data
  modifierRepository.put("data", new class extends AST.Modifier {
    preprocess() {}

    modifyShape(context: unknown, objectShape: unknown, restModifiers: unknown, data: string) {
      objectShape = this.proceedModifyShape(context, objectShape, restModifiers);
      return new ChangeDataShape(data, objectShape);
    }
  });
}

const MAP = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function to_b58(B: Uint8Array, A: string) {
  let d: number[] = [],
    s = "",
    j: number, c: number, n: number;
  for (let i = 0; i < B.length; ++i) {
    j = 0, c = B[i];
    s += c || s.length ^ i ? "" : 1;
    while (j in d || c) {
      n = d[j];
      n = n ? n * 256 + c : c; c = n / A.length | 0;
      d[j] = n % A.length; j++;
    }
  }
  while (j--) s += A[d[j]];
  return s;
}

function from_b58(S: string, A: string) {
  let d: number[] = [],
    b = [],
    j: number, c: number, n: number;
  for (let i = 0; i < S.length; ++i) {
    j = 0, c = A.indexOf(S[i]);
    if (c < 0) return undefined;
    c || b.length ^ i ? i : b.push(0);
    while (j in d || c) {
      n = d[j];
      n = n ? n * A.length + c : c;
      c = n >> 8;
      d[j] = n % 256; j++;
    }
  }
  while (j--) b.push(d[j]);
  return new Uint8Array(b);
}

/**
 * Encode a hex color for XyJax
 */
export function xyEncodeColor(color: string): string {
  return color.toUpperCase().replace(/[#0-9]/g, (char) => {
    if (char === "#")
      return "";
    return String.fromCharCode("G".charCodeAt(0) + parseInt(char));
  });
}

/**
 * Decode a hex color for XyJax
 */
export function xyDecodeColor(color: string): string {
  return "#" + color.replace(/[G-P]/g, (digit) => {
    return (digit.charCodeAt(0) - "G".charCodeAt(0)).toString();
  });
}

/**
 * Encode an object for XyJax
 */
export function tob52(str: string): string {
  const arr: number[] = [];
  for (let i = 0; i < str.length; ++i) {
    arr[i] = str.charCodeAt(i);
  }
  return to_b58(new Uint8Array(arr), MAP);
}

/**
 * Decode an object for XyJax
 */
export function fromb52(str: string): string {
  const arr = from_b58(str, MAP);
  let ret = "";
  for (let i = 0; i < arr.length; ++i) {
    ret += String.fromCharCode(arr[i]);
  }
  return ret;
}
