import {bind} from "@liqvid/utils/misc";
import {formatTimeMs} from "@liqvid/utils/time";
import type {Script} from "liqvid";
import {Recorder} from "../recorder";
import type {RecorderPlugin} from "../types";

type Marker = [string, number];
type MarkerFormatted = [string, string];

const icon = (
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
);

export class MarkerRecorder extends Recorder<Marker, MarkerFormatted[]> {
  private lastTime: number;
  script: Script;

  constructor() {
    super();
    bind(this, ["onMarkerUpdate"]);
  }

  beginRecording() {
    this.lastTime = 0;
    this.script.on("markerupdate", this.onMarkerUpdate);
  }

  endRecording() {
    this.script.off("markerupdate", this.onMarkerUpdate);
    this.captureMarker(this.script.markerName);
  }

  finalizeRecording(data: Marker[], startDelay: number, stopDelay: number) {
    data[0][1] -= startDelay;
    data[data.length - 1][1] += stopDelay;

    return data.map((cue) => [cue[0], formatTimeMs(cue[1])] as MarkerFormatted);
  }

  onMarkerUpdate(prevIndex: number) {
    if (this.manager.paused) return;

    this.captureMarker(this.script.markers[prevIndex][0]);
  }

  captureMarker(markerName: string) {
    const t = this.manager.getTime();
    this.push([markerName, t - this.lastTime]);

    this.lastTime = t;
  }
}

export function MarkerSaveComponent(props: {data: MarkerFormatted[]}) {
  return (
    <>
      <textarea readOnly value={format(props.data)}></textarea>
    </>
  );
}

export const MarkerRecording: RecorderPlugin<
  Marker,
  MarkerFormatted[],
  MarkerRecorder
> = {
  icon,
  key: "markers",
  name: "Markers",
  recorder: new MarkerRecorder(),
  saveComponent: MarkerSaveComponent,
};

function format(data: unknown) {
  return JSON.stringify(data, null, 2).replace(
    /\[\s+"(.+?)",\s+"(.+?)"\s+\]/g,
    '["$1", "$2"]'
  );
}
