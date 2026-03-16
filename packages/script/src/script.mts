import { Duration } from "@liqvid/duration";
import { EventEmitter } from "@liqvid/event-emitter";
import { Playback } from "@liqvid/playback";
import { bind, parseTime } from "@liqvid/utils";

import type { Marker } from "./types.mts";

export interface MarkerUpdateEvent<M extends string = string> {
  prev: Marker<M>;
  target: Script<M>;
  type: "markerupdate";
}

export interface ScriptEventsMap<M extends string> {
  markerupdate: MarkerUpdateEvent<M>;
}

export type ScriptEvent = keyof ScriptEventsMap<string>;

export class Script<M extends string = string> extends EventEmitter<
  ScriptEventsMap<M>
> {
  /* private properties */
  private __index: number;
  private __map: Map<M, Marker<M>>;

  /* public properties */
  /** The array of markers, in the form [name, startTime, endTime]. */
  markers: Marker<M>[] & {
    /** Get a marker by name. */
    get(name: M): Marker<M>;
  };

  /** The underlying {@link Playback} instance. */
  playback: Playback;

  // constructor
  constructor(markers: readonly (readonly [M, string])[]) {
    // validation
    if (markers.length === 0) {
      throw new Error("invalid");
    }

    // event emitter
    super();

    // bind methods
    // biome-ignore lint/suspicious/noExplicitAny: need to do this since __updateMarker is private
    bind(this as any, ["back", "forward", "__updateMarker"]);

    // parse times
    let time = new Duration();

    this.__index = 0;
    this.__map = new Map<M, Marker<M>>();

    this.markers = [] as unknown as Script<M>["markers"];
    this.markers.get = this.__map.get.bind(this.__map) as (
      name: M,
    ) => Marker<M>;

    for (let index = 0; index < markers.length; ++index) {
      const [name, stringDuration] = markers[index];

      const dur = new Duration({
        milliseconds: parseTime(stringDuration as string),
      });

      const end = time.plus(dur);

      const marker: Marker<M> = {
        duration: dur,
        end,
        index,
        name,
        start: time,
      };

      time = end;

      this.__map.set(name, marker);
      this.markers.push(marker);
    }

    // create playback object
    this.playback = new Playback();
    this.playback.duration$ = time;

    this.playback.addEventListener("seek", this.__updateMarker);
    this.playback.addEventListener("timeupdate", this.__updateMarker);
  }

  /* public methods */

  /** The currently active marker. */
  get active(): Marker<M> {
    return this.markers[this.__index];
  }

  /** Seek playback to the previous marker. */
  back(): void {
    const clampedPrevIndex = Math.max(0, this.__index - 1);
    const prevMarker = this.markers[clampedPrevIndex];
    this.playback.currentTime$ = prevMarker.start;
  }

  /** Advance playback to the next marker. */
  forward(): void {
    const clampedNextIndex = Math.min(
      this.markers.length - 1,
      this.__index + 1,
    );
    const nextMarker = this.markers[clampedNextIndex];
    this.playback.currentTime$ = nextMarker.start;
  }

  /** Update marker */
  private __updateMarker(): void {
    let lower = 0;
    let upper = this.markers.length - 1;
    let index = this.__index;
    const t = this.playback.currentTime$;

    while (true) {
      const marker = this.markers[index]!;

      if (t.lessThan(marker.start)) {
        upper = Math.max(0, index - 1);
      } else if (
        t.greaterThanOrEqual(marker.end) &&
        index < this.markers.length - 1
      ) {
        lower = Math.min(index + 1, this.markers.length - 1);
      } else {
        break;
      }

      index = Math.floor((lower + upper) / 2);
    }

    // console.log({ newIndex: index, oldIndex: this.__index, t });

    if (index === this.__index) return;

    const prev = this.markers[this.__index]!;
    this.__index = index;

    this.emit("markerupdate", {
      prev,
      target: this,
      type: "markerupdate",
    });
  }
}
