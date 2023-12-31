import type {ReplayData} from "@liqvid/utils/replay-data";
import {Recorder} from "../recorder";

export class ReplayDataRecorder<T> extends Recorder<
  [number, T],
  ReplayData<T>
> {
  private duration: number;

  constructor() {
    super();
    this.duration = 0;
  }

  beginRecording(): void {
    this.duration = 0;
  }

  finalizeRecording(
    data: ReplayData<T>
    // startDelay = 0,
    // stopDelay = 0
  ): ReplayData<T> {
    // for (let sum = 0, i = 0; i < data.length && sum < startDelay; ++i) {
    //   const dur = data[i][0];

    //   if (dur === 0) {
    //     continue;
    //   }
    //   if (sum + dur >= startDelay) {
    //     data[i][0] -= startDelay - sum;
    //     break;
    //   }
    //   sum += dur;
    //   // data.splice(i, 1);
    //   --i;
    // }
    // console.log(JSON.stringify(data, null, 2));

    return compress(data);
  }

  capture(time = this.manager.getTime(), data: T): void {
    if (time - this.duration < 0) {
      // console.error(time, this.duration, data);
    }
    this.push([time - this.duration, data]);
    this.duration = time;
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
      if (o instanceof Array) {
        return o.map((val) => compress(val, precision)) as T & unknown[];
      }
      if (o === null) {
        return o;
      }
      return Object.fromEntries(
        (Object.keys(o) as (keyof typeof o)[]).map((key) => [
          key,
          compress(o[key], precision),
        ])
      ) as Record<string, unknown> & T;
    case "number":
      return parseFloat(o.toFixed(precision)) as T & number;
    default:
      return o;
  }
}
