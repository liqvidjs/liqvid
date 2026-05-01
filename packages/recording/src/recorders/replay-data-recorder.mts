import type { ReplayData } from "@liqvid/utils";

import { BaseRecorder } from "../base-recorder.ts";
import type { RecordingData } from "../types.ts";

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
  abstract initial: Initial;

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
    return {
      $schema: this.$schema,
      data: this.data,
      initial: this.initial,
      package: this.package,
      version: this.version,
    };
  }
}
