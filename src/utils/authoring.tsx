import * as React from "react";
import aspectRatio from "../aspectRatio";

interface StyleBlock {
  style?: any;
}

// position an element
export function pos(x?: number, y?: number, w?: number, h?: number): StyleBlock;
export function pos(args: {x?: number; y?: number; w?: number; h?: number}): StyleBlock;
export function pos(...args: any[]): StyleBlock {
  let x, y, w, h;

  if (args.length === 1 && typeof args[0] === "object") {
    ({x, y, w, h} = args[0]);
  } else {
    [x, y, w, h] = args;
  }

  const style: any = {position: "absolute"};
  
  if (x !== undefined)
    style.left = `${x * aspectRatio}vmin`;
  if (y !== undefined)
    style.top = `${y * aspectRatio}vmin`;
  if (w !== undefined)
    style.width = `${w * aspectRatio}vmin`;
  if (h !== undefined)
    style.height = `${h * aspectRatio}vmin`;

  return {style};
};

// conditional display
export function showIf(cond: boolean): StyleBlock {
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

export function from(first: string, last: string) {
  return {
    ["data-from-first"]: first,
    ["data-from-last"]: last
  };
}

export function wrapIf(wrap: boolean, Tag: string, content: React.ReactChild) {
  return wrap ? (<Tag>{content}</Tag>) : content;
}
