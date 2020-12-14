import {captureRef} from "./react-utils";

/**
	Whether any available input mechanism can hover over elements. This is used as a standin for desktop/mobile.
*/
export const anyHover = window.matchMedia("(any-hover: hover)").matches;

/**
	Drop-in replacement for onClick handlers which works better on mobile.
  The innerRef attribute, and the implementation, is a hack around https://github.com/facebook/react/issues/2043.
*/
export const onClick = <T extends Node>(
  callback: (e: React.MouseEvent<T> | TouchEvent) => void,
  innerRef?: React.Ref<T>
) => {
  if (anyHover) {
    return {onClick: callback};
  } else {
    let touchId: number,
        target: T & EventTarget;

    // touchstart handler
    const onTouchStart = (e: TouchEvent) => {
      if (typeof touchId === "number")
        return;
      target = e.currentTarget as T;
      touchId = e.changedTouches[0].identifier;
    };

    // touchend handler
    const onTouchEnd = (e: TouchEvent) => {
      if (typeof touchId !== "number")
        return;

      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== touchId)
          continue;

        if (target.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
          callback(e);
        }

        touchId = undefined;
        break;
      }
    };

    return {
      ref: captureRef<T>(ref => {
        ref.addEventListener("touchstart", onTouchStart as (e: TouchEvent) => void, {passive: false});
        ref.addEventListener("touchend", onTouchEnd as (e: TouchEvent) => void, {passive: false});
      }, innerRef)
    };
  }
};

/**
  Replacement for addEventListener("click") which works better on mobile.
  Returns a function to remove the event listener.
*/
export const attachClickHandler = (node: Node, callback: (e: MouseEvent | TouchEvent) => void): () => void => {
  if (anyHover) {
    node.addEventListener("click", callback);
    return () => {
      node.removeEventListener("click", callback);
    };
  }

  let touchId: number;

  // touchstart handler
  const touchStart = (e: TouchEvent) => {
    if (typeof touchId === "number") return;
    touchId = e.changedTouches[0].identifier;
  };

  // touchend handler
  const touchEnd = (e: TouchEvent) => {
    if (typeof touchId !== "number") return;
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier !== touchId) continue;

      if (node.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
        callback(e);
      }

      touchId = undefined;
    }
  };

  node.addEventListener("touchstart", touchStart);
  node.addEventListener("touchend", touchEnd);

  return () => {
    node.removeEventListener("touchstart", touchStart);
    node.removeEventListener("touchend", touchEnd);
  };
};
