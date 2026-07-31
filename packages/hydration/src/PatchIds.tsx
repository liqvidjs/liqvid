import { Slot } from "@radix-ui/react-slot";
import { useEffect, useId } from "react";

import { HydrateElement } from "./HydrateElement";
import { useVeryFirstRender } from "./utils";

const SYM_STABLE = Symbol.for("@liqvid/hydration/PatchIds/stable");

const SYM_COMPLETED = Symbol.for(
  "@liqvid/hydration/PatchIds/hydrationCompleted",
);

type PatchedWindow = Window & {
  /** array of saved class names */
  雨?: string[];

  /** index of class name */
  日?: number;

  /**
   * store IDs canonically once they've been retrieved initially
   * needed to support Strict Mode double-rendering
   */
  [SYM_STABLE]?: Record<string, string>;

  /**
   * whether we have finished hydration
   * needed to support HMR (otherwise a component remount
   * re-runs the hydration magic)
   */
  [SYM_COMPLETED]?: boolean;
};

/**
 * If you are using hydration magic, components that use `useId()`
 * must be wrapped in this in order to work. (`useId()` depends
 * on the exact React tree.)
 * Many component libraries (e.g. Radix, Base UI) implicitly use
 * `useId()` internally.
 *
 * @example
 *
 * import { Menu } from "@base-ui/react";
 *
 * <Menu.Root>
 *   <PatchIds>
 *     <Menu.Trigger>Open</Menu.Trigger>
 *   </PatchIds>
 *   ...
 * </Menu.Root>
 */
export function PatchIds({ children }: { children: React.ReactElement }) {
  const isVeryFirstRender = useVeryFirstRender();

  /** only used on client */
  const key = useId();

  // cleanup
  // biome-ignore lint/correctness/useExhaustiveDependencies: doesn't actually depend on key
  useEffect(() => {
    if (!isVeryFirstRender()) return;

    const w = window as PatchedWindow;
    if (!w[SYM_STABLE]) return;
    delete w[SYM_STABLE][key];

    if (Object.keys(w[SYM_STABLE]).length === 0) {
      delete w.雨;
      delete w.日;
      delete w[SYM_STABLE];
    }
  }, [isVeryFirstRender]);

  // initial hydration
  if (isVeryFirstRender()) {
    const w = window as PatchedWindow;

    // counter for initial load
    w.日 ??= 0;

    // support Strict Mode
    w[SYM_STABLE] ??= {};
    // TODO: figure out why this can be null, it should never be
    w[SYM_STABLE][key] ??= w.雨?.[w.日++];

    return <Slot id={w[SYM_STABLE][key]}>{children}</Slot>;
  }

  return (
    <HydrateElement
      from={[]}
      hydrationFn={(node) => {
        // biome-ignore lint/suspicious/noAssignInExpressions: saving bytes
        ((window as PatchedWindow).雨 ??= []).push(node.id);
      }}
    >
      {children}
    </HydrateElement>
  );
}
