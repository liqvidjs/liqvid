import { assertType } from "./types.ts";

/* https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#matching_event_listeners_for_removal */
declare global {
  interface EventListenerOptions {
    passive?: boolean;
  }
}

/**
  Whether any available input mechanism can hover over elements. This is used as a standin for desktop/mobile.
*/
export const anyHover =
  typeof window !== "undefined"
    ? window.matchMedia?.("(any-hover: hover)")?.matches
    : undefined;

/**
 * Helper for implementing drag functionality, abstracting over mouse vs touch events.
 * @returns An event listener which should be added to both `mousedown` and `touchstart` events.
 */
export function onDrag<E extends MouseEvent | TouchEvent>(
  /** Callback for dragging (pointer is moved while down). */
  move: (
    /** The underlying `mousemove` or `touchmove` event */
    e: E,
    /** Information about the pointer location */
    hit: {
      /** Horizontal coordinate of pointer */
      x: number;
      /** Vertical coordinate of pointer */
      y: number;
      /** Horizontal displacement since last call */
      dx: number;
      /** Vertical displacement since last call */
      dy: number;
    },
  ) => void,
  /** Callback for when dragging begins (pointer is touched). */
  down: (
    /** The underlying `mousedown` or `touchstart` event */
    e: E,
    /** Information about the pointer location */
    hit: {
      /** Horizontal coordinate of pointer */
      x: number;
      /** Vertical coordinate of pointer */
      y: number;
    },
    /** The upHandler used internally by this method */
    upHandler: (e: E) => void,
    /** The moveHandler used internally by this method */
    moveHandler: (e: E) => void,
  ) => void = () => {},
  /** Callback for when dragging ends (pointer is lifted). */
  up: (
    /** The underlying `mouseup` or `touchcancel`/`touchend` event */
    e: E,
    /** Information about the pointer location */
    hit: {
      /** Horizontal coordinate of pointer */
      x: number;
      /** Vertical coordinate of pointer */
      y: number;
      /** Horizontal displacement since last call */
      dx: number;
      /** Vertical displacement since last call */
      dy: number;
    },
  ) => void = () => {},
) {
  return (e: E) => {
    /* click events */
    if (e instanceof MouseEvent) {
      if (e.button !== 0) return;

      let lastX = e.clientX,
        lastY = e.clientY;

      // up
      const upHandler = (e: MouseEvent | TouchEvent) => {
        assertType<MouseEvent>(e);
        const dx = e.clientX - lastX,
          dy = e.clientY - lastY;

        document.body.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);

        return up(e as E, { dx, dy, x: e.clientX, y: e.clientY });
      };

      // move
      const moveHandler = (e: MouseEvent | TouchEvent) => {
        assertType<MouseEvent>(e);
        const dx = e.clientX - lastX,
          dy = e.clientY - lastY;

        lastX = e.clientX;
        lastY = e.clientY;

        return move(e as E, { dx, dy, x: e.clientX, y: e.clientY });
      };

      document.body.addEventListener("mousemove", moveHandler, {
        passive: false,
      });
      window.addEventListener("mouseup", upHandler, { passive: false });

      return down(e, { x: e.clientX, y: e.clientY }, upHandler, moveHandler);
    } else {
      /* touch events */
      e.preventDefault();
      const touches = e.changedTouches;

      const touchId = touches[0].identifier;

      let lastX = touches[0].clientX,
        lastY = touches[0].clientY;

      // up
      const upHandler = (e: MouseEvent | TouchEvent) => {
        assertType<TouchEvent>(e);
        e.preventDefault();

        for (const touch of Array.from(e.changedTouches)) {
          if (touch.identifier !== touchId) continue;

          const dx = touch.clientX - lastX,
            dy = touch.clientY - lastY;

          window.removeEventListener("touchend", upHandler, {
            capture: false,
            passive: false,
          });
          window.removeEventListener("touchcancel", upHandler, {
            capture: false,
            passive: false,
          });
          window.removeEventListener("touchmove", moveHandler, {
            capture: false,
            passive: false,
          });

          return up(e as E, { dx, dy, x: touch.clientX, y: touch.clientY });
        }
      };

      // move
      const moveHandler = (e: MouseEvent | TouchEvent) => {
        assertType<TouchEvent>(e);
        e.preventDefault();
        for (const touch of Array.from(e.changedTouches)) {
          if (touch.identifier !== touchId) continue;

          const dx = touch.clientX - lastX,
            dy = touch.clientY - lastY;

          lastX = touch.clientX;
          lastY = touch.clientY;

          return move(e as E, { dx, dy, x: touch.clientX, y: touch.clientY });
        }
      };

      window.addEventListener("touchend", upHandler, {
        capture: false,
        passive: false,
      });
      window.addEventListener("touchcancel", upHandler, {
        capture: false,
        passive: false,
      });
      window.addEventListener("touchmove", moveHandler, {
        capture: false,
        passive: false,
      });

      return down(
        e,
        { x: touches[0].clientX, y: touches[0].clientY },
        upHandler,
        moveHandler,
      );
    }
  };
}

/**
 * Replacement for addEventListener("click") which works better on mobile.
 * @param node Event target.
 * @param callback Event listener.
 * @returns A function to remove the event listener.
 */
export function onClick<T extends HTMLElement | SVGElement>(
  node: T,
  callback: (e: (MouseEvent | TouchEvent) & { currentTarget: T }) => void,
): () => void {
  if (anyHover) {
    // @ts-expect-error TODO: sort this out
    node.addEventListener("click", callback);
    return () => {
      // @ts-expect-error TODO: sort this out
      node.removeEventListener("click", callback);
    };
  }

  let touchId: number | undefined;

  // touchstart handler
  const touchStart = (e: TouchEvent): void => {
    if (typeof touchId === "number") return;
    touchId = e.changedTouches[0].identifier;
  };

  // touchend handler
  const touchEnd = (e: TouchEvent): void => {
    if (typeof touchId !== "number") return;
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier !== touchId) continue;

      if (
        node.contains(document.elementFromPoint(touch.clientX, touch.clientY))
      ) {
        callback(e as TouchEvent & { currentTarget: T });
      }

      touchId = undefined;
    }
  };

  // @ts-expect-error TODO: sort this out
  node.addEventListener("touchstart", touchStart);
  // @ts-expect-error TODO: sort this out
  node.addEventListener("touchend", touchEnd);

  return () => {
    // @ts-expect-error TODO: sort this out
    node.removeEventListener("touchstart", touchStart);
    // @ts-expect-error TODO: sort this out
    node.removeEventListener("touchend", touchEnd);
  };
}
