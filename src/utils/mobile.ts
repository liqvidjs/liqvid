/**
	Whether any available input mechanism can hover over elements. This is used as a standin for desktop/mobile.
*/
export const anyHover = window.matchMedia("(any-hover: hover)").matches;

/**
	Drop-in replacement for onClick handlers which works better on mobile.
*/
export const onClick = <T extends Node>(callback: (e: React.MouseEvent<T> | React.TouchEvent<T>) => void) => {
  if (anyHover) {
    return {onClick: callback};
  } else {
    let touchId: number,
        target: T & EventTarget;
    return {
	    onTouchStart: (e: React.TouchEvent<T>) => {
	      if (typeof touchId === "number") return;
	      target = e.currentTarget;
	      touchId = e.changedTouches[0].identifier;
	    },
	    onTouchEnd: (e: React.TouchEvent<T>) => {
	      if (typeof touchId !== "number") return;
	      for (const touch of Array.from(e.changedTouches)) {
	        if (touch.identifier !== touchId) continue;

	        if (target.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
	          callback(e);
	        }

	        touchId = undefined;
	      }
	    }
    };
  }
};

/**
  Replacement for addEventListener("click") which works better on mobile.
  Returns a function to remove the event listener.
*/
export const attachClickHandler = (node: Node, callback: (e: MouseEvent| TouchEvent) => void): () => void => {
  if (anyHover) {
    node.addEventListener("click", callback);
    return () => {
      node.removeEventListener("click", callback);
    };
  }

  let touchId: number;

  const touchStart = (e: TouchEvent) => {
    if (typeof touchId === "number") return;
    touchId = e.changedTouches[0].identifier;
  };

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
