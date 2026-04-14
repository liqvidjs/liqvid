import { BaseRecorder } from "@liqvid/recording";
import {
  type LiqvidStudioRecordingPlugin,
  packageNameToDirName,
  usePluginApi,
} from "@liqvid/studio-plugin-api";
import { bind, formatTimeMs } from "@liqvid/utils";
import { useEffect } from "react";

import { useScript } from "./react/useScript";
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

  endRecording() {
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

const icon = (props?: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" {...props}>
    <title>Marker recording</title>
    <text
      fill="#FFF"
      fontFamily="Helvetica"
      fontSize="75"
      textAnchor="middle"
      x="50"
      y="75"
    >
      M
    </text>
  </svg>
);

export const MarkerRecording = {
  icon,
  name: "Markers",
  package: "@liqvid/script",

  recorder: new MarkerRecorder(),

  recordingComponent: ({ name }) => {
    const { makeToast } = usePluginApi();
    const onClick = async () => {
      try {
        await navigator.clipboard.writeText(
          `import ${sanitizeName(name)}Timings from "../.liqvid/recordings/${name}/${packageNameToDirName(MarkerRecording.package)}/timings.json";`,
        );

        makeToast({
          message: (
            <>
              Paste it into <code>markers.ts</code>
            </>
          ),
          title: "Copied import code to clipboard",
          type: "success",
        });
      } catch (_error) {}
    };

    return (
      <div>
        {icon({ height: 24, width: 24 })}

        <button className="lv-studio-button" onClick={onClick} type="button">
          Use
        </button>
      </div>
    );
  },
  useConfigurePlugin() {
    const script = useScript();

    useEffect(() => {
      MarkerRecording.recorder.configure({ script });
    }, [script]);
  },

  version: "1.0.0",
} satisfies LiqvidStudioRecordingPlugin<MarkerFormatted>;

function sanitizeName(name: string) {
  return name.replace(/-/g, "");
}
