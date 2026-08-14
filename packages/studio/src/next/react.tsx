"use client";

import {
  IsPreviewProvider,
  ProjectParamsProvider,
  ProjectPathProvider,
} from "@liqvid/studio-plugin-api";
import type { RelativeDir } from "effect-paths";

export function ProjectPathHelperComponent({
  children,
  isPreview,
  projectParams,
  projectPath,
}: {
  children?: React.ReactNode;
  isPreview: boolean;
  /**
   * Parameter values for parameterized projects.
   * e.g., `{ lang: "en", locale: "US" }`
   */
  projectParams?: Record<string, string>;
  projectPath: RelativeDir;
}) {
  return (
    <IsPreviewProvider value={isPreview}>
      {isPreview && (
        <style>{`[data-nextjs-dev-overlay="true"] {display: none !important;}`}</style>
      )}
      <ProjectPathProvider value={projectPath}>
        <ProjectParamsProvider value={projectParams ?? null}>
          {children}
        </ProjectParamsProvider>
      </ProjectPathProvider>
    </IsPreviewProvider>
  );
}
