import {objectDiff, type ObjectDiff} from "@liqvid/diff";
import type {TLKeyboardEventInfo} from "@tldraw/tldraw";

const CURSOR_NAMES = ["cross"] as const;
export type CursorName = (typeof CURSOR_NAMES)[number];

export interface CursorInfo {
  image: string;
  x: number;
  y: number;
}

/**
 * Get the SVGs for Tldraw's various cursor types
 */
export function getCursorSvgs(): Map<string, CursorInfo> {
  const cursorPrefix = "--tl-cursor-"
  const map = new Map<string, CursorInfo>();

  for (const rule of getTlcontainerStyleRules()) {
    for (let i = 0; i < rule.style.length; ++i) {
      const property = rule.style.item(i);
      if (!property.startsWith("--")) continue;
      // console.log(property);
      if (!property.startsWith(cursorPrefix)) continue;
      const name = property.slice(cursorPrefix.length);

      const value = rule.style.getPropertyValue(property);
      const $_ = value.match(
        /^(?<url>.+\))\s+(?<x>\d+) (?<y>\d+),\s+(?<fallback>[a-z-]+)$/,
      )!;

      const groups = $_?.groups as
        | Record<"url" | "x" | "y" | "fallback", string>
        | undefined;
      if (!groups) continue;

      map.set(name, {
        image: groups.url,
        x: parseFloat(groups.x),
        y: parseFloat(groups.y),
      });
      
    }
  }

  return map;
}

/** Find CSS rules matching .tl-container */
function* getTlcontainerStyleRules() {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (!isStyleRule(rule)) continue;
        if (rule.selectorText !== ".tl-container") continue;

        yield rule;
      }
    } catch (e) {
      // tried to access cross-domain stylesheet
    }
  }
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.constructor.name === "CSSStyleRule";
}

/** Typed {@link Object.keys} */
export function objectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/** Wrap a Tldraw event info so that Liqvid's keymap can handle it */
export function asKeyboardEventish(
  e: TLKeyboardEventInfo,
): Pick<KeyboardEvent, "getModifierState" | "preventDefault"> &
  TLKeyboardEventInfo {
  return {
    ...e,
    preventDefault() {},
    getModifierState(modifier: string) {
      switch (modifier) {
        case "Alt":
          return e.altKey;
        case "Control":
          return e.ctrlKey;
        case "Shift":
          return e.shiftKey;
      }
      return false;
    },
  };
}

export function storeDiff<T>(diff: ObjectDiff<T>) {
  return objectDiff("snapshot", objectDiff("store", diff));
}
