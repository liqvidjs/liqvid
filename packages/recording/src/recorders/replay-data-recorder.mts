import { mapRecord, type ReplayData, truncate } from "@liqvid/utils";

import { BaseRecorder } from "../base-recorder";
import type { RecordingData } from "../types.mts";

export abstract class ReplayDataRecorder<
  Datum,
  Initial,
  Config = unknown,
> extends BaseRecorder<
  [number, Datum],
  RecordingData<ReplayData<Datum>, Initial>,
  Config
> {
  private duration: number = 0;
  protected data: [number, Datum][] = [];

  abstract readonly package: string;
  abstract readonly version: string;
  abstract readonly $schema?: string;
  abstract initial?: Initial;

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
      return mapRecord(o, (value) => compress(value, precision)) as T;
    case "number":
      return truncate(o, precision) as T & number;
    default:
      return o;
  }
}
