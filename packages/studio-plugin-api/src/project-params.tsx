"use client";

import { lazy, Suspense } from "react";

export {
  useProjectParams,
  useProjectParamsOptional,
} from "./project-params.client.ts";

export const ProjectParamsProvider = (
  props: React.ComponentProps<typeof ProjectParamsProviderInner>,
) => (
  <Suspense fallback={null}>
    <ProjectParamsProviderInner {...props} />
  </Suspense>
);

export const ProjectParamsProviderInner = lazy(() =>
  import("./project-params.client.ts").then((mod) => ({
    default: mod.projectParamsContext.Provider,
  })),
);
