"use client";

import type { ConfigurationComponentProps } from "@liqvid/studio-plugin-api";
import { useEffect } from "react";

import { type CodeMirrorInstance, CodeRecording } from "./recording.tsx";

export function ConfigurationComponent({
  instances,
}: ConfigurationComponentProps<CodeMirrorInstance>) {
  // TODO: disallow code recording in this case
  if (instances.size === 0) return null;

  // TODO: support multiple targets
  useEffect(() => {
    const instance = Array.from(instances)[0];
    instance.provideRecorder(CodeRecording.recorder);

    return () => {
      instance.provideRecorder(undefined);
    };
  }, [instances]);

  return (
    <select
      onChange={(x) => {
        console.log(x);
      }}
    >
      {Array.from(instances).map((instance, i) => (
        <option key={instance.name ?? i}>
          {instance.name ?? `Instance #${i}`}
        </option>
      ))}
    </select>
  );
}
