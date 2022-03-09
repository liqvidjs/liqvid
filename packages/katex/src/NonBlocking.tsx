import {usePlayer} from "liqvid";
import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef} from "react";
import {KaTeXReady} from "./loading";

/**
 * KTX element API
 */
export interface Handle {
  domElement: HTMLSpanElement;
  ready: Promise<void>;
}

type Props = {
  display?: boolean;
  reparse?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>;

// blocking version
const implementation: React.ForwardRefRenderFunction<Handle, Props> = function KTX(props, ref) {
  const spanRef = useRef<HTMLSpanElement>();
  const {children, display, reparse, ...attrs} = props;
  const resolveRef = useRef<() => void>();
  const player = usePlayer();

  const ready = useMemo(() => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  // handle
  useImperativeHandle(ref, () => ({
    domElement: spanRef.current,
    ready
  }));

  useEffect(() => {
    KaTeXReady.then(([katex, macros]) => {
      katex.render(children.toString(), spanRef.current, {
        displayMode: !!display,
        macros,
        strict: "ignore",
        throwOnError: false,
        trust: true
      });

      // move katex into placeholder element
      const child = spanRef.current.firstElementChild as HTMLSpanElement;
      for (let i = 0, len = child.classList.length; i < len; ++i) {
        spanRef.current.classList.add(child.classList.item(i));
      }

      while (child.childNodes.length > 0) {
        spanRef.current.appendChild(child.firstChild);
      }
      child.remove();

      // reparse tree?
      if (reparse) {
        player.reparseTree(spanRef.current);
      }

      // resolve promise
      resolveRef.current();
    });
  }, [children]);

  // Google Chrome fails without this
  if (display) {
    if (!attrs.style)
      attrs.style = {};
    attrs.style.display = "block";
  }

  return (
    <span {...attrs} ref={spanRef}/>
  );
};

export const KTXNonBlocking = forwardRef(implementation);

