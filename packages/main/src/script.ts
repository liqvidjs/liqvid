import {EventEmitter} from "events";
import {between, bind} from "@liqvid/utils/misc";
import {parseTime, timeRegexp} from "@liqvid/utils/time";
import type StrictEventEmitter from "strict-event-emitter-types";

import {Playback} from "./playback";

export type Marker<M extends string = string> = [M, number, number];

interface ScriptEvents {
  markerupdate: number;
}

export class Script<
  M extends string = string,
> extends (EventEmitter as new () => StrictEventEmitter<
  EventEmitter,
  ScriptEvents
>) {
  /** The underlying {@link Playback} instance. */
  playback: Playback;

  /** The array of markers, in the form [name, startTime, endTime]. */
  markers: Marker<M>[];

  /** Index of the active marker. */
  markerIndex: number;

  constructor(
    markers: readonly (
      | readonly [M, number | string, number | string]
      | readonly [M, number | string]
    )[],
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
    this.markers = [];

    for (const marker of markers) {
      if (marker.length === 2) {
        const [, duration] = marker;

        this.markers.push([
          marker[0],
          time,
          time +
            (typeof duration === "string" ? parseTime(duration) : duration),
        ]);
      } else {
        const [, begin, end] = marker;

        this.markers.push([
          marker[0],
          typeof begin === "string" ? parseTime(begin) : begin,
          typeof end === "string" ? parseTime(end) : end,
        ]);
      }

      time = this.markers[this.markers.length - 1][2];
    }

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
      this.markers[Math.min(this.markers.length - 1, this.markerIndex + 1)][1],
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
