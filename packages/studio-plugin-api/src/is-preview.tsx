"use client";

import { lazy, Suspense } from "react";

export {
  useIsPreview,
  useIsPreviewOptional,
  useIsPreviewOrProduction,
} from "./is-preview.client.mts";

export const IsPreviewProvider = (
  props: React.ComponentProps<typeof IsPreviewProviderInner>,
) => (
  <Suspense fallback={null}>
    <IsPreviewProviderInner {...props} />
  </Suspense>
);

const IsPreviewProviderInner = lazy(() =>
  import("./is-preview.client.mts").then((mod) => ({
    default: mod.isPreviewContext.Provider,
  })),
);
