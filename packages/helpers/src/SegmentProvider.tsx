"use client";

import { createContext, useContext, useMemo } from "react";

export type HidingStrategy = "invisible" | "unmount";

export interface SegmentContext {
  hideWith: HidingStrategy;
}

const SegmentContext = createContext<SegmentContext>({
  hideWith: "unmount",
});

export function useSegmentContext(): SegmentContext {
  return useContext(SegmentContext);
}

/**
 * Set the hiding strategy used by `<Segment>` descendants
 */
export function SegmentProvider({
  children,
  hideWith = "unmount",
}: {
  children?: React.ReactNode;
  hideWith?: HidingStrategy;
}) {
  const context = useMemo(() => ({ hideWith }), [hideWith]);

  return (
    <SegmentContext.Provider value={context}>
      {children}
    </SegmentContext.Provider>
  );
}
