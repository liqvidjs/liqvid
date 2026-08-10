"use client";

import {
  IsPreviewProvider,
  ProjectPathProvider,
} from "@liqvid/studio-plugin-api";
import type { RelativeDir } from "effect-paths";

export function ProjectPathHelperComponent({
  children,
  isPreview,
  projectPath,
}: {
  children?: React.ReactNode;
  isPreview: boolean;
  projectPath: RelativeDir;
}) {
  return (
    <IsPreviewProvider value={isPreview}>
      {isPreview && (
        <style>{`[data-nextjs-dev-overlay="true"] {display: none !important;}`}</style>
      )}
      <ProjectPathProvider value={projectPath}>{children}</ProjectPathProvider>
    </IsPreviewProvider>
  );
}
