import {Children, cloneElement, forwardRef, isValidElement, useEffect, useMemo, useRef, useImperativeHandle} from "react";
import {usePlayer} from "liqvid";

import {Handle as KTXHandle, KTXNonBlocking} from "./NonBlocking";
import { KTXBlocking } from "./Blocking";

interface Handle {
  ready: Promise<void>;
}

interface Props {
  reparse?: boolean;
}

/**
 * Wait for a bunch of things to be rendered
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
  });
});

function shouldInspect(node: React.ReactNode): node is React.ReactElement & React.RefAttributes<KTXHandle> {
  return isValidElement(node) && typeof node.type === "object" && (node.type === KTXBlocking || node.type === KTXNonBlocking);
}

// belongs in a separate file, but currently only used here
// (as well as in liqvid, but that can't be helped)
export function recursiveMap(
  children: React.ReactNode,
  fn: (child: React.ReactNode) => React.ReactNode
): React.ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    if ("children" in child.props) {
      child = cloneElement(child, {
        children: recursiveMap(child.props.children, fn)
      });
    }

    return fn(child);
  });
}

function usePromise(deps: React.DependencyList = []): [Promise<void>, () => void, () => void] {
  const resolve = useRef<() => void>();
  const reject = useRef<() => void>();

  const promise = useMemo(() => new Promise<void>((res, rej) => {
    resolve.current = res;
    reject.current = rej;
  }), deps);

  return [promise, resolve.current, reject.current];
}

/**
 * Find least common ancestor of an array of elements
 * @param elements Elements
 * @returns Deepest node containing all passed elements
 */
function leastCommonAncestor(elements: Element[]) {
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