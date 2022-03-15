import {recursiveMap, usePromise} from "@liqvid/utils/react";
import {usePlayer} from "liqvid";
import React, {cloneElement, forwardRef, isValidElement, ReactElement, useEffect, useImperativeHandle, useRef} from "react";
import {KTX} from "./fancy";
import {Handle as KTXHandle, KTX as KTXPlain} from "./plain";

/** RenderGroup element API */
interface Handle {
  /** Promise that resolves once all KTX descendants have finished typesetting */
  ready: Promise<void>;
}

interface Props {
  /**
   * Whether to reparse descendants for `during()` and `from()`
   * @default false
  */
  reparse?: boolean;
}

/**
 * Wait for several things to be rendered
*/
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
        ref: (ref: KTXHandle) => {
          if (!ref) return;

          elements.current.push(ref.domElement);
          promises.current.push(ref.ready);

          // pass along original ref
          if (typeof originalRef === "function") {
            originalRef(ref);
          } else if (originalRef && typeof originalRef === "object") {
            (originalRef as React.MutableRefObject<KTXHandle>).current = ref;
          }
        }
      });
    }

    return node;
  }) as unknown as React.ReactElement;
});

/**
 * Determine whether the node is a <KTX> element
 * @param node Element to check
 */
function shouldInspect(node: React.ReactNode): node is React.ReactElement & React.RefAttributes<KTXHandle> {
  return isValidElement(node) && typeof node.type === "object" && (node.type === KTX || node.type === KTXPlain);
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
