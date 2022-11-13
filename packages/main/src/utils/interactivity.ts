import {onDrag} from "@liqvid/utils/interaction";
import {captureRef} from "@liqvid/utils/react";

type Move = Parameters<typeof onDrag>[0];
type Down = Parameters<typeof dragHelper>[1];
type DownArgs = Parameters<typeof onDrag>[1] extends (
  arg0: unknown,
  ...args: infer T
) => void
  ? T
  : never;
type Up = Parameters<typeof onDrag>[2];

function isReactMouseEvent<T>(
  e: MouseEvent | React.MouseEvent<T> | React.TouchEvent<T> | TouchEvent
): e is React.MouseEvent<T> {
  return "nativeEvent" in e && e.nativeEvent instanceof MouseEvent;
}

/**
 * Helper for implementing drag functionality, abstracting over mouse vs touch events.
 * @returns An event listener which should be added to both `mousedown` and `touchstart` events.
 */
export function dragHelper<T extends HTMLElement | SVGElement>(
  move: Move,
  /** Callback for when dragging begins (pointer is touched). */
  down: (
    /** The underlying `mousedown` or `touchstart` event */
    e: MouseEvent | React.MouseEvent<T> | React.TouchEvent<T> | TouchEvent,
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
  up: Up = () => {}
) {
  /*
    We can't directly use the version from @liqvid/utils/interaction because down() might want to use React types.
    Hence this goofiness.
  */
  let args: DownArgs;
  const __down: Parameters<typeof onDrag>[1] = (e, ...captureArgs) => {
    args = captureArgs;
  };
  const listener = onDrag(move, __down, up);

  return (
    e: MouseEvent | React.MouseEvent<T> | React.TouchEvent<T> | TouchEvent
  ) => {
    if ((e instanceof MouseEvent || isReactMouseEvent(e)) && e.button !== 0)
      return;

    if ("nativeEvent" in e) {
      listener(e.nativeEvent);
    } else {
      listener(e);
    }

    down(e, ...args);
  };
}

/**
 * Helper for implementing drag functionality, abstracting over mouse vs touch events.
 * @param innerRef Any `ref` that you want attached to the element, since this method attaches its own `ref` attribute. This is a hack around https://github.com/facebook/react/issues/2043.
 * @returns An object of event handlers which should be added to a React element with {...}
 */
export function dragHelperReact<T extends HTMLElement | SVGElement>(
  move: Move,
  down?: Down,
  up?: Up,
  innerRef?: React.Ref<T>
) {
  const listener = dragHelper(move, down, up);

  /* https://github.com/microsoft/TypeScript/issues/46819 */
  type AEL = HTMLElement["addEventListener"];

  if (innerRef) {
    const intercept = captureRef(
      (ref) =>
        (ref.addEventListener as AEL)("touchstart", listener, {passive: false}),
      innerRef
    );
    return {
      "data-affords": "click",
      onMouseDown: listener,
      ref: intercept,
    };
  } else {
    return {
      "data-affords": "click",
      onMouseDown: listener,
      onTouchStart: listener,
    };
  }
}
