"use client";

import { makeContext } from "@liqvid/utils";
import { useMemo } from "react";

export type HidingStrategy = "invisible" | "unmount";

export interface SegmentContext {
  hideWith: HidingStrategy;
}

const SegmentContext = makeContext<SegmentContext>({
  defaultValue: {
    hideWith: "unmount",
  },
  name: "Segment",
  uniqueKey: "@liqvid/segment",
});

export const useSegmentContext = SegmentContext.use;

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
