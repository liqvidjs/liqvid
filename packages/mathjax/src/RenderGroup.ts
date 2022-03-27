import {recursiveMap, usePromise} from "@liqvid/utils/react";
import {usePlayer} from "liqvid";
import {cloneElement, forwardRef, isValidElement, useEffect, useImperativeHandle, useRef} from "react";
import {MJX as MJXFancy} from "./fancy";
import {Handle as MJXHandle, MJX as MJXPlain} from "./plain";

interface Handle {
  /** Promise that resolves once all descendant <MJX>s have rendered */
  ready: Promise<void>;
}

interface Props {
  /**
   * 
   * @default false
  */
  reparse?: boolean;
}

/**
 * Wait for a bunch of things to be rendered
 */
// @ts-ignore we don't know how to type `recursiveMap` yet
export const RenderGroup = forwardRef<Handle, Props>(function RenderGroup(props, ref) {
  const [ready, resolve] = usePromise();

  // handle
  useImperativeHandle(ref, () => ({ready}));

  const elements = useRef<HTMLSpanElement[]>([]);
  const promises = useRef<Promise<unknown>[]>([]);

  // reparsing
  const player = usePlayer();
  useEffect(() => {
    // promises
    Promise.all(promises.current).then(() => {
      // reparse
      if (props.reparse) {
        player.reparseTree(leastCommonAncestor(elements.current));
      }

      // ready()
      resolve();
    });
  }, []);

  return recursiveMap(props.children, node => {
    if (shouldInspect(node)) {
      const originalRef = node.ref;
      return cloneElement(node, {
        ref: (ref: MJXHandle) => {
          if (!ref) return;

          elements.current.push(ref.domElement);
          promises.current.push(ref.ready);

          // pass along original ref
          if (typeof originalRef === "function") {
            originalRef(ref);
          } else if (originalRef && typeof originalRef === "object") {
            (originalRef as React.MutableRefObject<MJXHandle>).current = ref;
          }
        }
      });
    }

    return node;
  });
});

/** Whether the element is an <MJX> */
function shouldInspect(node: React.ReactNode): node is React.ReactElement & React.RefAttributes<MJXHandle> {
  return isValidElement(node) && typeof node.type === "object" && (node.type === MJXFancy || node.type === MJXPlain);
}

/**
 * Find least common ancestor of an array of elements
 * @param elements Elements
 * @returns Deepest node containing all passed elements
 */
function leastCommonAncestor(elements: HTMLElement[]): HTMLElement {
  if (elements.length === 0) {
    throw new Error("Must pass at least one element");
  }

  let ancestor = elements[0];
  let failing = elements.slice(1);
  while (failing.length > 0) {
    ancestor = ancestor.parentElement;
    failing = failing.filter(node => !ancestor.contains(node));
  }
  return ancestor;
}
