import type { ReplayData } from "@liqvid/utils";
import { truncate } from "@liqvid/utils";

import { BaseRecorder } from "../base-recorder";

export class ReplayDataRecorder<Datum, Config = unknown> extends BaseRecorder<
  [number, Datum],
  ReplayData<Datum>,
  Config
> {
  private duration: number = 0;
  protected data: [number, Datum][] = [];

  override beginRecording(timestamp = performance.now()): void {
    super.beginRecording(timestamp);
    this.data = [];
    this.duration = 0;
  }

  capture(time = this.getTime(), data: Datum): void {
    if (time - this.duration < 0) {
      // console.error(time, this.duration, data);
    }
    this.data.push([time - this.duration, data]);
    this.duration = time;
  }

  finalizeRecording() {
    return this.data;
  }
}

/**
 * Truncate numerical precision to reduce filesize.
 * @param o Data to compress.
 * @param precision Number of decimal points to include.
 */
export function compress<T>(o: T, precision = 2): T {
  switch (typeof o) {
    case "object":
      if (Array.isArray(o)) {
        return o.map((val) => compress(val, precision)) as T & unknown[];
      }
      if (o === null) {
        return o;
      }
      return Object.fromEntries(
        (Object.keys(o) as (keyof typeof o)[]).map((key) => [
          key,
          compress(o[key], precision),
        ]),
      ) as Record<string, unknown> & T;
    case "number":
      return truncate(o, precision) as T & number;
    default:
      return o;
  }
}
