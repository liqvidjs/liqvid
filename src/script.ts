import {EventEmitter} from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import {between, bind} from "./utils/misc";
import {parseTime, timeRegexp} from "./utils/time";

import Playback from "./playback";

type Marker = [string, number, number];

interface ScriptEvents {
  "markerupdate": number;
}

export default class Script {
  hub: StrictEventEmitter<EventEmitter, ScriptEvents>;

  /**
  The underlying {@link Playback} object.
  */
  playback: Playback;
  markers: Marker[];

  /**
  Index of the active marker.
  */
  markerIndex: number;

  constructor(markers: ([string, string | number] | [string, string | number, string | number])[]) {
    this.hub = new EventEmitter() as StrictEventEmitter<EventEmitter, ScriptEvents>;
    this.hub.setMaxListeners(0);

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

    this.playback.hub.on("seek", this.__updateMarker);
    this.playback.hub.on("timeupdate", this.__updateMarker);
  }

  // getter
  /**
  Name of the active marker.
  */
  get markerName() {
    return this.markers[this.markerIndex][0];
  }

  // public methods
  /**
  Seek playback to the previous marker.
  */
  back() {
    this.playback.seek(this.markers[Math.max(0, this.markerIndex - 1)][1]);
  }

  /**
  Advance playback to the next marker.
  */
  forward() {
    this.playback.seek(this.markers[Math.min(this.markers.length - 1, this.markerIndex + 1)][1]);
  }
  
  markerByName(name: string) {
    return this.markers[this.markerNumberOf(name)];
  }

  /**
  Returns the first index of a marker named `name`. Throws an error if no marker named `name` exists.

  @throws {Error}
  Thrown if no marker named `name` exists.
  */
  markerNumberOf(name: string) {
    for (let i = 0; i < this.markers.length; ++i) {
      if (this.markers[i][0] === name) return i;
    }
    throw new Error(`Marker ${name} does not exist`);
  }

  /**
  If `start` is a string, returns the starting time of the marker with that name. Otherwise, returns `start`.
  */
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

  /**
  If `end` is a string, returns the ending time of the marker with that name. Otherwise, returns `end`.
  */
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
      this.hub.emit("markerupdate", prevIndex);
    }
  }
}
