import {combineRefs} from "@liqvid/utils/react";
import {usePlayer} from "liqvid";
import {forwardRef, useEffect, useRef} from "react";
import {Handle, KTX as KTXPlain} from "./plain";

interface Props extends React.ComponentProps<typeof KTXPlain> {
  /**
   * Player events to obstruct
   * @default "canplay canplaythrough"
  */
  obstruct?: string;

  /**
   * Whether to reparse descendants for `during()` and `from()`
   * @default false
  */
  reparse?: boolean;
}

/** Component for KaTeX code */
export const KTX = forwardRef<Handle, Props>(function KTX(props, ref) {
  const {obstruct = "canplay canplaythrough", reparse = false, ...attrs} = props;

  const plain = useRef<Handle>();
  const combined = combineRefs(plain, ref);

  const player = usePlayer();
  
  useEffect(() => {
    // obstruction
    if (obstruct.match(/\bcanplay\b/)) {
      player.obstruct("canplay", plain.current.ready);
    }
    if (obstruct.match("canplaythrough")) {
      player.obstruct("canplaythrough", plain.current.ready);
    }

    // reparsing
    if (reparse) {
      plain.current.ready.then(() => player.reparseTree(plain.current.domElement));
    }
  }, []);

  return (<KTXPlain ref={combined} {...attrs} />);
});
