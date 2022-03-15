import * as React from "react";
import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef} from "react";

export interface Handle {
  /** Underlying <span> or <mjx-container> element. */
  domElement: HTMLElement;
  ready?: Promise<void>;
}

interface Props {
  /**
   * If true, will render using typesetPromise()
   * @default false
   */
  async?: boolean;

  /** Display mode or inline */
  display?: boolean;

  /** Whether to rerender on resize (necessary for XyJax) */
  resize?: boolean;

  /**
   * Whether to wrap in a <span> element or insert directly
   * @default false
   */
  span?: boolean;
}

const implementation: React.ForwardRefRenderFunction<Handle, Props> = function MJX(props, ref) {
  const {
    children,
    async = false, display = false, resize = false, span = false,
    ...attrs
  } = props;

  const spanRef = useRef<HTMLElement>();
  const [ready, resolve] = usePromise();

  /* typeset */
  useEffect(() => {
    MathJax.startup.promise.then(() => {
      MathJax.typeset([spanRef.current]);
      
      // replace wrapper span with content
      if (false && !span) {
        const element = spanRef.current.firstElementChild as HTMLElement;
        spanRef.current.replaceWith(element);
        spanRef.current = element;
      }

      resolve();
    });
  }, []);

  // handle
  useImperativeHandle(ref, () => ({
    get domElement() {
      return spanRef.current;
    },
    ready
  }));

  const [open, close] = display ? ["\\[", "\\]"] : ["\\(", "\\)"];
  
  // Google Chrome fails without this
  // if (display) {
  //   if (!attrs.style)
  //     attrs.style = {};
  //   attrs.style.display = "block";
  // }

  return (
    <span {...attrs} ref={spanRef}>{open + children + close}</span>
  );
};

export const MJX = forwardRef(implementation);

// export function typeset(code: string) {
//   MathJax.startup.promise = MathJax.startup.promise.then(() => MathJax.typesetPromise(code()))
//                    .catch((err) => console.log('Typeset failed: ' + err.message));
//   return MathJax.startup.promise;
// }

function usePromise(deps: React.DependencyList = []): [Promise<void>, () => void] {
  const resolveRef = useRef<() => void>();
  const promise = useMemo(() => new Promise<void>((resolve) => {
    resolveRef.current = resolve;
  }), []);

  return [promise, resolveRef.current];
}