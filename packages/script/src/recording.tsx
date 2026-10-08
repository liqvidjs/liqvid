import { BaseRecorder } from "@liqvid/recording";
import type { LiqvidStudioRecordingPlugin } from "@liqvid/studio-plugin-api";
import { bind, formatTimeMs } from "@liqvid/utils";
import { lazy, useEffect } from "react";

import { icon } from "./icon.tsx";
import { useScriptOptional } from "./react/useScript.tsx";
import type { MarkerUpdateEvent, Script } from "./script.mts";
import type { MarkerFormatted, SerializedMarker } from "./types.mts";

export class MarkerRecorder extends BaseRecorder<
  SerializedMarker,
  MarkerFormatted[],
  { script: Script }
> {
  private lastTime = 0;

  private script?: Script;

  private data: SerializedMarker[] = [];

  constructor() {
    super();
    bind(this, ["onMarkerUpdate"]);
  }

  configure({ script }: { script: Script }) {
    this.script = script;
  }

  override beginRecording() {
    super.beginRecording();
    if (!this.script) {
      throw new Error("must call configure() with script");
    }

    // reset
    this.data = [];
    this.lastTime = 0;

    // subscribe
    this.script.addEventListener("markerupdate", this.onMarkerUpdate);
  }

  override endRecording() {
    if (!this.script) {
      throw new Error("must call configure() with script");
    }
    this.script.removeEventListener("markerupdate", this.onMarkerUpdate);
    this.captureMarker(this.script.active.name);
  }

  finalizeRecording() {
    return this.data.map(
      ([name, ms]): MarkerFormatted => [name, formatTimeMs(ms)],
    );
  }

  onMarkerUpdate({ prev }: MarkerUpdateEvent<string>) {
    if (this.paused) return;

    this.captureMarker(prev.name);
  }

  captureMarker(markerName: string) {
    const t = this.getTime();
    this.data.push([markerName, t - this.lastTime]);

    this.lastTime = t;
  }
}

export const MarkerRecording = {
  icon,
  name: "Markers",
  package: "@liqvid/script",

  recorder: new MarkerRecorder(),

  recordingComponent: lazy(() =>
    import("./liqvid-studio.tsx").then((mod) => ({
      default: mod.RecordingComponent,
    })),
  ),
  useConfigurePlugin() {
    const script = useScriptOptional();

    if (!script) return;

    useEffect(() => {
      MarkerRecording.recorder.configure({ script });
    }, [script]);
  },

  version: "1.0.0",
} satisfies LiqvidStudioRecordingPlugin<MarkerFormatted>;
