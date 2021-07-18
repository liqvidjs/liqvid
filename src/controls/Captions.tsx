import * as React from "react";
import {useCallback, useEffect, useMemo} from "react";

import {requestFullScreen, exitFullScreen, isFullScreen, onFullScreenChange} from "../fake-fullscreen";
import {useKeyMap, usePlayer} from "../hooks";
import {useForceUpdate} from "../utils/react-utils";
import {onClick} from "../utils/mobile";

export default function Captions() {
  const player = usePlayer();
  const keymap = useKeyMap();
  const forceUpdate = useForceUpdate();
  const toggleCaptions = useCallback((e: KeyboardEvent | TouchEvent | React.MouseEvent<HTMLButtonElement>) => {
    player.canvas.parentElement.classList.toggle("lv-captions");

    // blur or keyboard controls will get snagged
    if (e.currentTarget instanceof HTMLButtonElement)
      e.currentTarget.blur();
  }, []);

  useEffect(() => {
    // keyboard shortcut
    keymap.bind("C", toggleCaptions);

    return () => {
      keymap.unbind("C", toggleCaptions);
    };
  }, []);

  const events = useMemo(() => onClick(toggleCaptions), []);

  return (
    <button className="lv-controls-captions" {...events}>
      <svg viewBox="0 0 36 36">
        <path d="M 6.00014 8.00002 C 4.33815 8.00002 2.99981 8.8919 2.99981 9.99989 L 2.99981 25.9999 C 2.99981 27.1079 4.33815 27.9998 6.00014 27.9998 L 30.0002 27.9998 C 31.6622 27.9998 33 27.1079 33 25.9999 L 33 9.99989 C 33 8.8919 31.6622 8.00002 30.0002 8.00002 L 6.00014 8.00002 Z M 14.4032 14.0389 C 15.33 14.0389 16.0827 14.3128 16.6615 14.8606 C 17.006 15.1844 17.2644 15.6495 17.4366 16.2558 L 15.9225 16.6176 C 15.833 16.2248 15.6452 15.9148 15.3592 15.6874 C 15.0768 15.46 14.7322 15.3463 14.3257 15.3463 C 13.7642 15.3463 13.3077 15.5479 12.9563 15.9509 C 12.6083 16.354 12.4344 17.0069 12.4344 17.9095 C 12.4344 18.8672 12.6066 19.5493 12.9511 19.9559 C 13.2956 20.3624 13.7435 20.5656 14.2947 20.5656 C 14.7012 20.5656 15.0509 20.4365 15.3437 20.1781 C 15.6366 19.9197 15.8467 19.5132 15.9742 18.9585 L 17.4573 19.4288 C 17.2299 20.2556 16.851 20.8705 16.3204 21.2736 C 15.7933 21.6732 15.1233 21.8731 14.3102 21.8731 C 13.3043 21.8731 12.4774 21.5303 11.8298 20.8447 C 11.1821 20.1557 10.8582 19.2152 10.8582 18.0232 C 10.8582 16.7623 11.1838 15.7839 11.8349 15.0879 C 12.486 14.3886 13.3422 14.0389 14.4032 14.0389 Z M 22.0462 14.0389 C 22.9729 14.0389 23.7257 14.3128 24.3044 14.8606 C 24.6489 15.1844 24.9073 15.6495 25.0796 16.2558 L 23.5655 16.6176 C 23.4759 16.2248 23.2881 15.9148 23.0022 15.6874 C 22.7197 15.46 22.3752 15.3463 21.9687 15.3463 C 21.4071 15.3463 20.9506 15.5479 20.5992 15.9509 C 20.2513 16.354 20.0773 17.0069 20.0773 17.9095 C 20.0773 18.8672 20.2496 19.5493 20.5941 19.9559 C 20.9386 20.3624 21.3864 20.5656 21.9377 20.5656 C 22.3442 20.5656 22.6938 20.4365 22.9867 20.1781 C 23.2795 19.9197 23.4897 19.5132 23.6171 18.9585 L 25.1002 19.4288 C 24.8729 20.2556 24.4939 20.8705 23.9634 21.2736 C 23.4363 21.6732 22.7662 21.8731 21.9532 21.8731 C 20.9472 21.8731 20.1204 21.5303 19.4727 20.8447 C 18.825 20.1557 18.5012 19.2152 18.5012 18.0232 C 18.5012 16.7623 18.8267 15.7839 19.4779 15.0879 C 20.129 14.3886 20.9851 14.0389 22.0462 14.0389 Z"/>
      </svg>
    </button>
  );
}
