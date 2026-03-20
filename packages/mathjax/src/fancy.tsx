import { usePlayer } from "@liqvid/player";
import { combineRefs } from "@liqvid/utils";
import { useEffect, useRef } from "react";

import { type Handle, MJX as MJXPlain } from "./plain";

/** Component for MathJax code */
export function MJX({ ref, ...props }: React.ComponentProps<typeof MJXPlain>) {
  const { ...attrs } = props;

  const plainRef = useRef<Handle>(null);
  const combined = combineRefs(plainRef, ref);

  const { registerRenderingTask } = usePlayer();

  useEffect(() => {
    const plain = plainRef.current;
    if (!plain?.domElement) return;

    const task = { visible: isVisible(plain.domElement) };
    let unsubscribe: null | (() => void) = registerRenderingTask(task);

    const onStart = () => {
      unsubscribe?.();
      if (!plain.domElement) return;
      unsubscribe = registerRenderingTask({
        visible: isVisible(plain.domElement),
      });
    };
    const onDone = () => {
      unsubscribe?.();
      unsubscribe = null;
    };

    plain.hub.addEventListener("start", onStart);
    plain.hub.addEventListener("done", onDone);

    return () => {
      unsubscribe?.();
    };
  }, [registerRenderingTask]);

  return <MJXPlain ref={combined} {...attrs} />;
}

function isVisible(elt: Element) {
  return elt.checkVisibility() && !elt.closest("lv-script-invisible");
}
