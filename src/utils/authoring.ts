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
};

export function during(prefix: string) {
  return {
    ["data-during"]: prefix
  };
}

export function from(first: string, last?: string) {
  return {
    ["data-from-first"]: first,
    ["data-from-last"]: last
  };
}
