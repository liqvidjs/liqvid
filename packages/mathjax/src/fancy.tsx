import {combineRefs} from "@liqvid/utils/react";
import {usePlayer} from "liqvid";
import {forwardRef, useEffect, useRef} from "react";
import {Handle, MJX as MJXPlain, MJXText as MJXTextPlain} from "./plain";

interface Props extends React.ComponentProps<typeof MJXPlain> {
  /**
   * Player events to obstruct.
   * @default "canplay canplaythrough"
   */
  obstruct?: string;

  /**
   * Whether to reparse the canvas.
   * @default false
   */
  reparse?: boolean;
}

/** Component for MathJax code */
export const MJX = forwardRef<Handle, Props>(function MJX(props, ref) {
  const {
    obstruct = "canplay canplaythrough",
    reparse = false,
    ...attrs
  } = props;

  const plain = useRef<Handle>();
  const combined = combineRefs(plain, ref);

  const player = usePlayer();

  useEffect(() => {
    // obstruction
    const obstructions = obstruct.split(" ");
    if (obstructions.includes("canplay")) {
      player.obstruct("canplay", plain.current.ready);
    }
    if (obstructions.includes("canplaythrough")) {
      player.obstruct("canplaythrough", plain.current.ready);
    }

    // reparsing
    if (reparse) {
      plain.current.ready.then(() =>
        player.reparseTree(plain.current.domElement),
      );
    }
  }, []);

  return <MJXPlain ref={combined} {...attrs} />;
});

export const MJXText = forwardRef<
  {},
  React.ComponentProps<typeof MJXTextPlain>
>(function MJXText(props, ref) {
  const {...attrs} = props;
  return <MJXTextPlain tagName="p" {...attrs} />;
});
