"use client";

import type { ParameterValues } from "@liqvid/schemas";
import {
  ProjectParamsProvider,
  ProjectPathProvider,
} from "@liqvid/studio-plugin-api";
import type { RelativeDir } from "effect-paths";

export function MysteriouslyFixCreateContextErrorsDuringBuild({
  children,
  projectPath,
  projectParams,
}: {
  children: React.ReactNode;
  projectParams: ParameterValues | null;
  projectPath: RelativeDir;
}) {
  return (
    <ProjectPathProvider value={projectPath}>
      <ProjectParamsProvider value={projectParams}>
        {children}
      </ProjectParamsProvider>
    </ProjectPathProvider>
  );
}
