import {EventEmitter} from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import {between, bind} from "@liqvid/utils/misc";
import {parseTime, timeRegexp} from "@liqvid/utils/time";

import {Playback} from "./playback";

export type Marker = [string, number, number];

interface ScriptEvents {
  markerupdate: number;
}

export class Script extends (EventEmitter as new () => StrictEventEmitter<
  EventEmitter,
  ScriptEvents
>) {
  /** The underlying {@link Playback} instance. */
  playback: Playback;

  /** The array of markers, in the form [name, startTime, endTime]. */
  markers: Marker[];

  /** Index of the active marker. */
  markerIndex: number;

  constructor(
    markers: (
      | [string, string | number]
      | [string, string | number, string | number]
    )[]
  ) {
    super();
    this.setMaxListeners(0);

    // bind methods
    bind(this, [
      "back",
      "forward",
      "markerByName",
      "markerNumberOf",
      "parseStart",
      "parseEnd",
      "__updateMarker",
    ]);

    // parse times
    let time = 0;
    for (const marker of markers) {
      if (marker.length === 2) {
        const [, duration] = marker;
        marker[1] = time;
        (marker as unknown as Marker)[2] =
          time +
          (typeof duration === "string" ? parseTime(duration) : duration);
      } else {
        const [, begin, end] = marker;
        marker[1] = typeof begin === "string" ? parseTime(begin) : begin;
        marker[2] = typeof end === "string" ? parseTime(end) : end;
      }

      time = marker[2] as number;
    }
    this.markers = markers as Marker[];

    this.markerIndex = 0;

    // create playback object
    this.playback = new Playback({
      duration: this.markers[this.markers.length - 1][2],
    });

    this.playback.on("seek", this.__updateMarker);
    this.playback.on("timeupdate", this.__updateMarker);
  }

  /** @deprecated */
  get hub(): this {
    return this;
  }

  /** Name of the active marker. */
  get markerName(): string {
    return this.markers[this.markerIndex][0];
  }

  // public methods

  /** Seek playback to the previous marker. */
  back(): void {
    this.playback.seek(this.markers[Math.max(0, this.markerIndex - 1)][1]);
  }

  /** Advance playback to the next marker. */
  forward(): void {
    this.playback.seek(
      this.markers[Math.min(this.markers.length - 1, this.markerIndex + 1)][1]
    );
  }

  /**
   * Returns the first marker with the given name.
   * @throws {Error} If no marker named `name` exists.
   */
  markerByName(name: string): Marker {
    return this.markers[this.markerNumberOf(name)];
  }

  /**
   * Returns the first index of a marker named `name`.
   * @throws {Error} If no marker named `name` exists.
   */
  markerNumberOf(name: string): number {
    for (let i = 0; i < this.markers.length; ++i) {
      if (this.markers[i][0] === name) return i;
    }
    throw new Error(`Marker ${name} does not exist`);
  }

  /** If `start` is a string, returns the starting time of the marker with that name. Otherwise, returns `start`. */
  parseStart(start: number | string): number {
    if (typeof start === "string") {
      if (start.match(timeRegexp)) return parseTime(start);
      else return this.markerByName(start)[1];
    } else {
      return start;
    }
  }

  /** If `end` is a string, returns the ending time of the marker with that name. Otherwise, returns `end`. */
  parseEnd(end: number | string): number {
    if (typeof end === "string") {
      if (end.match(timeRegexp)) return parseTime(end);
      else return this.markerByName(end)[2];
    } else {
      return end;
    }
  }

  /** Update marker */
  __updateMarker(t: number): void {
    let newIndex;
    for (let i = 0; i < this.markers.length; ++i) {
      const [, begin, end] = this.markers[i];
      if (between(begin, t, end)) {
        newIndex = i;
        break;
      }
    }

    if (newIndex === undefined) newIndex = this.markers.length - 1;

    if (newIndex !== this.markerIndex) {
      const prevIndex = this.markerIndex;
      this.markerIndex = newIndex;
      this.emit("markerupdate", prevIndex);
    }
  }
}
