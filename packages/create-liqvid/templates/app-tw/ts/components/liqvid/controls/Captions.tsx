import { onClickReact } from "@liqvid/utils";
import { ClosedCaptioningIcon } from "@phosphor-icons/react";
import { useKeymap, usePlayer } from "liqvid";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Captions control. */
export function Captions() {
  const { domElement } = usePlayer();
  const keymap = useKeymap();
  const [visible, setVisible] = useState(false);

  const toggleCaptions = useCallback(
    (
      e:
        | KeyboardEvent
        | React.MouseEvent<HTMLButtonElement>
        | React.TouchEvent<HTMLButtonElement>,
    ) => {
      domElement?.classList.toggle("lv-captions");

      // blur or keyboard controls will get snagged
      if (e.currentTarget instanceof HTMLButtonElement) e.currentTarget.blur();
    },
    // note that player.canvas may not have loaded yet
    [domElement],
  );

  useEffect(() => {
    // visibility
    setVisible(!!domElement?.querySelector("track"));

    // keyboard shortcut
    keymap.bind("C", toggleCaptions);

    return () => {
      keymap.unbind("C", toggleCaptions);
    };
  }, [keymap, domElement, toggleCaptions]);

  const events = useMemo(() => onClickReact(toggleCaptions), [toggleCaptions]);

  const style: React.CSSProperties = useMemo(
    () => (visible ? {} : { display: "none" }),
    [visible],
  );

  return (
    <button
      className="lv-controls-captions"
      {...events}
      {...{ style }}
      title="Captions (c)"
    >
      <ClosedCaptioningIcon />
    </button>
  );
}
