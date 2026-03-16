import { Duration, type DurationSetter } from "@liqvid/duration";

import type { Recorder } from "./recorder.mts";

export abstract class BaseRecorder<
  Datum = unknown,
  FinalData = Datum[],
  Config = unknown,
> implements Recorder<Datum, FinalData, Config>
{
  /* ------------------------------ private variables ------------------------------ */
  /** Time when recording began. */
  private baseTime = 0;

  /** Time when last paused. */
  private lastPauseTime: number = 0;

  /** Total duration that recording has been paused. */
  private pauseTime: Duration;

  /** Whether recording is currently in progress. */
  protected active = false;

  /** Whether recording is currently paused. */
  protected paused = false;

  #setPauseTime: DurationSetter;

  constructor() {
    {
      const [d, setter] = Duration.withSetter();
      this.pauseTime = d;
      this.#setPauseTime = setter;
    }

    // bind methods
    this.getTime = this.getTime.bind(this);
  }

  beginRecording(timestamp = performance.now()): void {
    this.baseTime = timestamp;

    // initialize
    this.#setPauseTime.setToZero();
  }

  pauseRecording?(timestamp = performance.now()) {
    this.lastPauseTime = timestamp;

    this.paused = true;
  }

  resumeRecording(): void {
    this.#setPauseTime.add({
      milliseconds: performance.now() - this.lastPauseTime,
    });

    this.paused = false;
  }

  abstract finalizeRecording(): FinalData;

  protected getTime(): number {
    return performance.now() - this.baseTime - this.pauseTime.inMilliseconds();
  }
}
