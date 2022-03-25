import type {ReplayData} from "@liqvid/utils/replay-data";
import {Recorder} from "../recorder";

export class ReplayDataRecorder<T> extends Recorder<[number, T], ReplayData<T>> {
  private duration: number;
  private index: number;

  constructor() {
    super();
    this.duration = 0;
    this.index = -1;
  }

  beginRecording(): void {
    this.duration = 0;
    this.index = -1;
  }

  finalizeRecording(data: ReplayData<T>, startDelay = 0, stopDelay = 0) {
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

    return data;
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
Limit number to 2 decimal places to reduce filesize.
*/
function formatNum(x: number): number {
  return parseFloat(x.toFixed(2));
}
