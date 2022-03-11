import {forwardRef, useEffect, useImperativeHandle, useRef} from "react";
import {KaTeXReady} from "./loading";
import {usePromise} from "@liqvid/utils/react";

/**
 * KTX element API
 */
export interface Handle {
  /** The underlying <span> element */
  domElement: HTMLSpanElement;

  /** Promise that resolves once typesetting is finished */
  ready: Promise<void>;
}

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Whether to render in display style
   * @default false
   */
  display?: boolean;
}

/** Component for KaTeX code */
export const KTX = forwardRef<Handle, Props>(function KTX(props, ref) {
  const spanRef = useRef<HTMLSpanElement>();
  const {children, display = false, ...attrs} = props;
  const [ready, resolve] = usePromise();

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

      /* move katex into placeholder element */
      const child = spanRef.current.firstElementChild as HTMLSpanElement;

      // copy classes
      for (let i = 0, len = child.classList.length; i < len; ++i) {
        spanRef.current.classList.add(child.classList.item(i));
      }

      // move children
      while (child.childNodes.length > 0) {
        spanRef.current.appendChild(child.firstChild);
      }

      // delete child
      child.remove();

      // resolve promise
      resolve();
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
});
