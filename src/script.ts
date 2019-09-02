import {EventEmitter} from "events";
import {between, bind} from "./utils/misc";
import {parseTime} from "./utils/time";

import Playback from "./playback";

type Marker = [string, number, number];

export default class Script {
  hub: EventEmitter;
  playback: Playback;
  markers: Marker[];
  markerIndex: number;

  constructor(markers: ([string, string | number] | [string, string | number, string | number])[]) {
    this.hub = new EventEmitter();
    this.hub.setMaxListeners(0);

    // bind methods
    bind(this, ["markerByName", "markerNumberOf", "__updateMarker"]);

    // parse times
    let time = 0;
    for (const marker of markers) {
      if (marker.length === 2) {
        const [, duration] = marker as [string, string];
        marker[1] = time;
        (marker as (string | number)[])[2] = time + parseTime(duration);
      } else {
        const [, begin, end] = marker as [string, string, string];
        marker[1] = parseTime(begin);
        marker[2] = parseTime(end);
      }

      time = marker[2] as number;
    }
    this.markers = markers as Marker[];

    this.markerIndex = 0;

    // create playback object
    this.playback = new Playback({
      duration: this.markers[this.markers.length - 1][2]
    });

    this.playback.hub.on("seek", this.__updateMarker);
    this.playback.hub.on("timeupdate", this.__updateMarker);
  }

  // getter
  get markerName() {
    return this.markers[this.markerIndex][0];
  }

  // public methods
  back() {
    this.playback.seek(this.markers[Math.max(0, this.markerIndex - 1)][1]);
  }

  forward() {
    this.playback.seek(this.markers[Math.min(this.markers.length - 1, this.markerIndex + 1)][1]);
  }
  
  markerByName(name: string) {
    return this.markers[this.markerNumberOf(name)];
  }

  markerNumberOf(name: string) {
    for (let i = 0; i < this.markers.length; ++i) {
      if (this.markers[i][0] === name) return i;
    }
    throw new Error(`Marker ${name} does not exist`);
  }

  // update marker
  __updateMarker(t: number) {
    let newIndex;
    for (let i = 0; i < this.markers.length; ++i) {
      const [, begin, end] = this.markers[i];
      if (between(begin, t, end)) {
        newIndex = i;
        break;
      }
    }

    if (newIndex === undefined)
      newIndex = this.markers.length - 1;

    if (newIndex !== this.markerIndex) {
      const prevIndex = this.markerIndex;
      this.markerIndex = newIndex;
      this.hub.emit("markerupdate", prevIndex);
    }
  }
}
