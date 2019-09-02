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
	      if (touchId) return;
	      target = e.currentTarget;
	      touchId = e.changedTouches[0].identifier;
	    },
	    onTouchEnd: (e: React.TouchEvent<T>) => {
	      if (!touchId) return;
	      for (const touch of Array.from(e.changedTouches)) {
	        if (touch.identifier !== touchId) continue;

	        if (target.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
	          callback(e);
	        }

	        touchId = null;
	      }
	    }
    };
  }
};
