import {EventEmitter} from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import {between, bind} from "@liqvid/utils/misc";
import {parseTime, timeRegexp} from "@liqvid/utils/time";

import Playback from "./playback";

type Marker = [string, number, number];

interface ScriptEvents {
  "markerupdate": number;
}

export default class Script
  extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, ScriptEvents>)
{
  playback: Playback;
  markers: Marker[];
  markerIndex: number;

  constructor(markers: ([string, string | number] | [string, string | number, string | number])[]) {
    super();
    this.setMaxListeners(0);

    // bind methods
    bind(this, ["back", "forward", "markerByName", "markerNumberOf", "parseStart", "parseEnd", "__updateMarker"]);

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

    this.playback.on("seek", this.__updateMarker);
    this.playback.on("timeupdate", this.__updateMarker);
  }

  get hub() {
    return this;
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

  parseStart(start: number | string) {
    if (typeof start === "string") {
      if (start.match(timeRegexp))
        return parseTime(start);
      else
        return this.markerByName(start)[1];
    } else {
      return start;
    }
  }

  parseEnd(end: number | string) {
    if (typeof end === "string") {
      if (end.match(timeRegexp))
        return parseTime(end);
      else
        return this.markerByName(end)[2];
    } else {
      return end;
    }
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
      this.emit("markerupdate", prevIndex);
    }
  }
}
