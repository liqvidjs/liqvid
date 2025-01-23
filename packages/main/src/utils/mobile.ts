import {anyHover} from "@liqvid/utils/interaction";
import {captureRef} from "@liqvid/utils/react";

export {
  anyHover,
  onClick as attachClickHandler,
} from "@liqvid/utils/interaction";

/**
	Drop-in replacement for onClick handlers which works better on mobile.
  The innerRef attribute, and the implementation, is a hack around https://github.com/facebook/react/issues/2043.
*/
export const onClick = <T extends HTMLElement | SVGElement>(
  callback: (e: React.MouseEvent<T> | TouchEvent) => void,
  innerRef?: React.Ref<T>,
) => {
  if (anyHover) {
    return {onClick: callback};
  } else {
    let touchId: number, target: EventTarget & T;

    // touchstart handler
    const onTouchStart = (e: TouchEvent): void => {
      if (typeof touchId === "number") return;
      target = e.currentTarget as T;
      touchId = e.changedTouches[0].identifier;
    };

    // touchend handler
    const onTouchEnd = (e: TouchEvent): void => {
      if (typeof touchId !== "number") return;

      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== touchId) continue;

        if (
          target.contains(
            document.elementFromPoint(touch.clientX, touch.clientY),
          )
        ) {
          callback(e);
        }

        touchId = undefined;
        break;
      }
    };

    return {
      ref: captureRef<T>((ref) => {
        ref.addEventListener(
          "touchstart",
          onTouchStart as (e: TouchEvent) => void,
          {passive: false},
        );
        ref.addEventListener(
          "touchend",
          onTouchEnd as (e: TouchEvent) => void,
          {passive: false},
        );
      }, innerRef),
    };
  }
};
