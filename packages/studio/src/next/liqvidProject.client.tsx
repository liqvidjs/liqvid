"use client";

import type { ParameterValues } from "@liqvid/schemas";
import {
  ProjectParamsProvider,
  ProjectPathProvider,
} from "@liqvid/studio-plugin-api";
import type { RelativeDir } from "effect-paths";

import {
  type RecordingsContextValue,
  RecordingsProvider,
} from "#_/contexts/recordings";
import { useRecordings } from "#_/contexts/recordings.client.js";

export function MysteriouslyFixCreateContextErrorsDuringBuild({
  children,
  projectPath,
  projectParams,
  recordingData,
}: {
  children: React.ReactNode;
  projectParams: ParameterValues | null;
  projectPath: RelativeDir;
  recordingData: RecordingsContextValue;
}) {
  return (
    <ProjectPathProvider value={projectPath}>
      <ProjectParamsProvider value={projectParams}>
        <RecordingsProvider value={recordingData}>
          {children}
        </RecordingsProvider>
      </ProjectParamsProvider>
    </ProjectPathProvider>
  );
}

export function Test() {
  const r = useRecordings();

  return <pre>{JSON.stringify(r, null, 2)}</pre>;
}
