"use client";

import { lazy, Suspense } from "react";

export {
  useProjectPath,
  useProjectPathOptional,
} from "./project-path.client.ts";

export const ProjectPathProvider = (
  props: React.ComponentProps<typeof ProjectPathProviderInner>,
) => (
  <Suspense fallback={null}>
    <ProjectPathProviderInner {...props} />
  </Suspense>
);

export const ProjectPathProviderInner = lazy(() =>
  import("./project-path.client.ts").then((mod) => ({
    default: mod.projectPathContext.Provider,
  })),
);
