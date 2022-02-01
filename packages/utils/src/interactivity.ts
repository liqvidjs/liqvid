/* https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#matching_event_listeners_for_removal */
declare global {
  interface EventListenerOptions {
    passive?: boolean;
  }
}

/**
 * Helper for implementing drag functionality, abstracting over mouse vs touch events.
 * @returns An event listener which should be added to both `mousedown` and `touchstart` events.
 */
export function dragHelper(
  /** Callback for dragging (pointer is moved while down). */
  move: (
    /** The underlying `mousemove` or `touchmove` event */
    e: MouseEvent | TouchEvent,
    /** Information about the pointer location */
    hit: {
      /** Horizontal coordinate of pointer */
      x: number;
      /** Vertical coordinate of pointer */
      y: number;
      /** Horizontal displacement since last call */
      dx: number;
      /** Vertical displacement since last call */
      dy: number
    }) => void,
  /** Callback for when dragging begins (pointer is touched). */
  down: (
    /** The underlying `mousedown` or `touchstart` event */
    e: MouseEvent | TouchEvent,
    /** Information about the pointer location */
    hit: {
      /** Horizontal coordinate of pointer */
      x: number;
      /** Vertical coordinate of pointer */
      y: number;
    },
    /** The upHandler used internally by this method */
    upHandler: (e: MouseEvent | TouchEvent) => void,
    /** The moveHandler used internally by this method */
    moveHandler: (e: MouseEvent | TouchEvent) => void
  ) => void = () => {},
  /** Callback for when dragging ends (pointer is lifted). */
  up: (
    /** The underlying `mouseup` or `touchcancel`/`touchend` event */
    e: MouseEvent | TouchEvent,
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
    }) => void = () => {}
) {
  return (e: MouseEvent | TouchEvent) => {
    /* click events */
    if (e instanceof MouseEvent) {
      if (e.button !== 0) return;

      let lastX = e.clientX,
          lastY = e.clientY;

      // up
      const upHandler = (e: MouseEvent) => {
        const dx = e.clientX - lastX,
              dy = e.clientY - lastY;

        document.body.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);

        return up(e, {x: e.clientX, y: e.clientY, dx, dy});
      };

      // move
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
      /* touch events */
      e.preventDefault();
      const touches = e.changedTouches;

      const touchId = touches[0].identifier;

      let lastX = touches[0].clientX,
          lastY = touches[0].clientY;

      // up
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

      // move
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
