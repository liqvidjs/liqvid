import type { JSX } from "react";

const interactiveElements = [
  "a",
  "area",
  "button",
  "input",
  "option",
  "select",
  "textarea",
] satisfies (keyof JSX.IntrinsicElements)[];

export function isInteractiveElement(elt: Element) {
  return (interactiveElements as string[]).includes(elt.nodeName.toLowerCase());
}
