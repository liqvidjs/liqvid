import {Player} from "../Player";

import {captureRef} from "./react-utils";

/* https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#matching_event_listeners_for_removal */
declare global {
  interface EventListenerOptions {
    passive?: boolean;
  }
}

function isReactMouseEvent<T>(
  e: MouseEvent | React.MouseEvent<T> | TouchEvent | React.TouchEvent<T>
): e is React.MouseEvent<T> {
  return ("nativeEvent" in e) && e.nativeEvent instanceof MouseEvent;
}

export function dragHelper<T extends HTMLElement | SVGElement>(
  move: (e: MouseEvent | TouchEvent, hit: {x: number; y: number; dx: number; dy: number}) => void,
  down: (
    e: MouseEvent | React.MouseEvent<T> | TouchEvent | React.TouchEvent<T>,
    hit: {x: number; y: number},
    upHandler: (e: MouseEvent | TouchEvent) => void,
    moveHandler: (e: MouseEvent | TouchEvent) => void
  ) => void = () => {},
  up: (e: MouseEvent | TouchEvent, hit: {x: number; y: number; dx: number; dy: number}) => void = () => {}
) {
  return (e: MouseEvent | React.MouseEvent<T> | TouchEvent | React.TouchEvent<T>) => {
    if (e instanceof MouseEvent || isReactMouseEvent(e)) {
      if (e.button !== 0) return;

      let lastX = e.clientX,
          lastY = e.clientY;

      const upHandler = (e: MouseEvent) => {
        const dx = e.clientX - lastX,
              dy = e.clientY - lastY;

        document.body.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);

        return up(e, {x: e.clientX, y: e.clientY, dx, dy});
      };

      const moveHandler = (e: MouseEvent) => {
        const dx = e.clientX - lastX,
              dy = e.clientY - lastY;

        lastX = e.clientX;
        lastY = e.clientY;

        return move(e, {x: e.clientX, y: e.clientY, dx, dy});
      };

      document.body.addEventListener("mousemove", moveHandler, {passive: false});
      window.addEventListener("mouseup", upHandler, {passive: false});

      return down(e, {x: lastX, y: lastY}, upHandler, moveHandler);
    } else {
      e.preventDefault();
      const touches = e.changedTouches;

      const touchId = touches[0].identifier;

      let lastX = touches[0].clientX,
          lastY = touches[0].clientY;

      const upHandler = (e: TouchEvent) => {
        e.preventDefault();

        for (const touch of Array.from(e.changedTouches)) {
          if (touch.identifier !== touchId) continue;

          const dx = touch.clientX - lastX,
                dy = touch.clientY - lastY;
          
          window.removeEventListener("touchend", upHandler, {capture: false, passive: false});
          window.removeEventListener("touchcancel", upHandler, {capture: false, passive: false});
          window.removeEventListener("touchmove", moveHandler, {capture: false, passive: false});

          return up(e, {x: touch.clientX, y: touch.clientY, dx, dy});
        }
      };

      const moveHandler = (e: TouchEvent) => {
        e.preventDefault();
        for (const touch of Array.from(e.changedTouches)) {
          if (touch.identifier !== touchId) continue;
          
          const dx = touch.clientX - lastX,
                dy = touch.clientY - lastY;
          
          lastX = touch.clientX;
          lastY = touch.clientY;
          
          return move(e, {x: touch.clientX, y: touch.clientY, dx, dy});
        }
      };

      window.addEventListener("touchend", upHandler, {capture: false, passive: false});
      window.addEventListener("touchcancel", upHandler, {capture: false, passive: false});
      window.addEventListener("touchmove", moveHandler, {capture: false, passive: false});

      return down(e, {x: lastX, y: lastY}, upHandler, moveHandler);
    }
  };
}

type Arg1 = Parameters<typeof dragHelper>[0];
type Arg2 = Parameters<typeof dragHelper>[1];
type Arg3 = Parameters<typeof dragHelper>[2];

/**
  the innerRef attribute is a hack around https://github.com/facebook/react/issues/2043.
*/
export function dragHelperReact<T extends HTMLElement | SVGElement>(move: Arg1, down?: Arg2, up?: Arg3, innerRef?: React.Ref<T>) {
  const listener = dragHelper(move, down, up);
  
  /* https://github.com/microsoft/TypeScript/issues/46819 */
  type AEL = HTMLElement["addEventListener"];

  if (innerRef) {
    const intercept = captureRef(ref => (ref.addEventListener as AEL)("touchstart", listener, {passive: false}), innerRef);
    return {
      onMouseDown: listener,
      onMouseUp: Player.preventCanvasClick,
      ref: intercept
    };
  } else {
    return {
      onMouseDown: listener,
      onMouseUp: Player.preventCanvasClick,
      onTouchStart: listener
    };
  }
}
