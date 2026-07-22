"use client";

import { ProjectPathProvider } from "@liqvid/studio-plugin-api";
import type { RelativeDir } from "effect-paths";

export function HelperComponent<P>({
  Component,
  projectPath,
  props,
}: {
  Component: (props: P & { projectPath: RelativeDir }) => React.ReactNode;
  projectPath: RelativeDir;
  props: P;
}) {
  return (
    <ProjectPathProvider value={projectPath}>
      <Component {...props} projectPath={projectPath} />
    </ProjectPathProvider>
  );
}
