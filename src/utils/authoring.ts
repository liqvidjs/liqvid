import {CSSProperties} from "react";

// conditional display
export function showIf(cond: boolean): {style?: CSSProperties} {
  if (!cond) return {
    style: {
      opacity: 0,
      pointerEvents: "none"
    }
  };
  return {};
}

/** Returns a CSS block to show the element only when marker name begins with `prefix` */
export function during(prefix: string) {
  return {
    ["data-during"]: prefix
  };
}

/** Returns a CSS block to show the element when marker is in [first, last) */
export function from(first: string, last?: string) {
  return {
    ["data-from-first"]: first,
    ["data-from-last"]: last
  };
}
