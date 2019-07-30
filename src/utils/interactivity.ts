import Player from "../Player";

function isReactMouseEvent<T>(
  e: MouseEvent | React.MouseEvent<T> | TouchEvent | React.TouchEvent<T>
): e is React.MouseEvent<T> {
  return ("nativeEvent" in e) && e.nativeEvent instanceof MouseEvent;
}

export function dragHelper<T extends Node>(
  move: (e: MouseEvent | TouchEvent, o: {x: number; y: number; dx: number; dy: number}) => void,
  down: (
    e: MouseEvent | React.MouseEvent<T> | TouchEvent | React.TouchEvent<T>,
    upHandler: (e: MouseEvent | TouchEvent) => void,
    moveHandler: (e: MouseEvent | TouchEvent) => void
  ) => void = () => {},
  up: (e: MouseEvent | TouchEvent) => void = () => {}
) {
  return (e: MouseEvent | React.MouseEvent<T> | TouchEvent | React.TouchEvent<T>) => {
    let upHandler: ((e: MouseEvent) => void) | ((e: TouchEvent) => void),
        moveHandler: ((e: MouseEvent) => void) | ((e: TouchEvent) => void);
    if (e instanceof MouseEvent || isReactMouseEvent(e)) {
      if (e.button !== 0) return;

      let lastX = e.clientX,
          lastY = e.clientY;

      upHandler = (e: MouseEvent) => {
        document.body.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);

        return up(e);
      };

      moveHandler = (e: MouseEvent) => {
        const dx = e.clientX - lastX,
              dy = e.clientY - lastY;

        lastX = e.clientX;
        lastY = e.clientY;

        return move(e, {x: e.clientX, y: e.clientY, dx, dy});
      };

      document.body.addEventListener("mousemove", moveHandler, false);
      window.addEventListener("mouseup", upHandler, false);
    } else {
      e.preventDefault();
      const touches = e.changedTouches;

      const touchId = touches[0].identifier;

      let lastX = touches[0].clientX,
          lastY = touches[0].clientY;

      upHandler = (e: TouchEvent) => {
        e.preventDefault();

        window.removeEventListener("touchend", moveHandler);
        window.removeEventListener("touchcancel", upHandler);
        window.removeEventListener("touchmove", moveHandler);

        return up(e);
      };

      moveHandler = (e: TouchEvent) => {
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

      window.addEventListener("touchend", upHandler, false);
      window.addEventListener("touchcancel", upHandler, false);
      window.addEventListener("touchmove", moveHandler, false);
    }

    // oh no oh no oh no
    // const _stopPropagation = e.stopPropagation.bind(e);
    // e.stopPropagation = () => {
    //   _stopPropagation();
    // };

    return down(e, upHandler, moveHandler);
  };
}

type DHR = typeof dragHelper;
type Arg1 = DHR extends (a: infer A, b: infer B, c: infer C) => void ? A : unknown;
type Arg2 = DHR extends (a: infer A, b: infer B, c: infer C) => void ? B : unknown;
type Arg3 = DHR extends (a: infer A, b: infer B, c: infer C) => void ? C : unknown;

// for use in React (ugh...)
export function dragHelperReact<T>(move: Arg1, down: Arg2, up: Arg3) {
  const listener = dragHelper(move, down, up);
  return {
    onMouseDown: listener,
    onMouseUp: (e: React.MouseEvent<T>) => {
      e.persist();
      // this sucks
      e[Player.ignoreCanvasClick] = true;
    },
    onTouchStart: listener
  };
}
