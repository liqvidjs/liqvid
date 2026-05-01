import { Duration, type DurationSetter } from "@liqvid/duration";
import { EventEmitter } from "@liqvid/event-emitter";
import { bind } from "@liqvid/utils";

import type { Recorder } from "./recorder.ts";

interface RecordingManagerEventMap {
  cancel: {
    target: RecordingManager;
    type: "cancel";
  };
  capture: {
    key: string;
    data: unknown;
  };
  finalize:
    | {
        key: string;
        data: unknown;
      }
    | undefined;
  pause: {
    target: RecordingManager;
    type: "pause";
  };
  resume: {
    target: RecordingManager;
    type: "resume";
  };
  start: {
    target: RecordingManager;
    type: "start";
  };
}

/**
 * Class for managing recording sessions.
 */
export class RecordingManager extends EventEmitter<RecordingManagerEventMap> {
  /* ------------------------------ public variables ------------------------------ */
  /** Whether recording is currently in progress. */
  active = false;

  /** Duration of recording. */
  duration: Duration;

  /** Whether recording is currently paused. */
  paused = false;

  /* ------------------------------ private variables ------------------------------ */
  /** Time when recording began. */
  private baseTime = 0;

  private plugins: Record<string, Recorder<unknown, unknown>> = {};

  /** Time when last paused. */
  private lastPauseTime: number = 0;

  /** Total duration that recording has been paused. */
  private pauseTime: Duration;

  #setDuration: DurationSetter;
  #setPauseTime: DurationSetter;

  /* ------------------------------ public methods ------------------------------ */
  constructor() {
    super();

    this.captureData = {};

    {
      const [d, setter] = Duration.withSetter();
      this.duration = d;
      this.#setDuration = setter;
    }
    {
      const [d, setter] = Duration.withSetter();
      this.pauseTime = d;
      this.#setPauseTime = setter;
    }

    bind(this, [
      "beginRecording",
      "cancelRecording",
      "endRecording",
      "pauseRecording",
      "resumeRecording",
    ]);
  }

  /**
   * Begin recording.
   *
   * @emits start
   */
  beginRecording(plugins: Record<string, Recorder<unknown, unknown>>): void {
    if (Object.keys(plugins).length === 0) return;

    // initialize
    this.plugins = plugins;
    this.captureData = {};
    this.#setPauseTime.setToZero();

    // call this as close as possible to beginRecording() to minimize "lag"
    this.baseTime = performance.now();

    for (const key in this.plugins) {
      this.plugins[key].beginRecording?.(this.baseTime);
    }

    this.paused = false;
    this.active = true;

    this.__emit("start");
  }

  /**
   * Cancel recording and discard all captured data.
   *
   * @emits cancel
   */
  cancelRecording(): void {
    if (!this.active) return;

    // stop all recorders
    for (const key in this.plugins) {
      this.plugins[key].endRecording?.();
    }

    // clear captured data
    this.captureData = {};

    this.active = false;
    this.paused = false;

    this.__emit("cancel");
  }

  /**
   * End recording and collect finalized data from recorders.
   * This is now async to support recorders that need async finalization (e.g., MediaRecorder).
   *
   * @emits finalize
   */
  async endRecording(): Promise<Record<string, unknown>> {
    const endTime = this.getTime();
    this.#setDuration.setMilliseconds(endTime);

    // stop all recorders
    for (const key in this.plugins) {
      this.plugins[key].endRecording?.();
    }

    const recording = Object.fromEntries(
      await Promise.all(
        Object.entries(this.plugins).map(async ([key, plugin]) => {
          const data = await plugin.finalizeRecording();

          this.emit("finalize", { data, key });
          return [key, data] as const;
        }),
      ),
    );

    this.active = false;
    this.paused = false;

    this.emit("finalize", undefined);

    return recording;
  }

  /** Get current recording time in milliseconds. */
  getTime(): number {
    return performance.now() - this.baseTime - this.pauseTime.inMilliseconds();
  }

  /**
   * Pause recording.
   *
   * @emits pause
   */
  pauseRecording(): void {
    this.lastPauseTime = performance.now();

    for (const key in this.plugins) {
      this.plugins[key].pauseRecording?.(this.lastPauseTime);
    }

    this.paused = true;
    this.__emit("pause");
  }

  /**
   * Resume recording from paused state.
   *
   * @emits resume
   */
  resumeRecording(): void {
    this.#setPauseTime.add({
      milliseconds: performance.now() - this.lastPauseTime,
    });

    for (const key in this.plugins) {
      this.plugins[key].resumeRecording?.();
    }

    this.paused = false;
    this.__emit("resume");
  }

  /* ------------------------------ private methods ------------------------------ */
  private __emit(
    eventName: Exclude<keyof RecordingManagerEventMap, "capture" | "finalize">,
  ) {
    this.emit(eventName, { target: this, type: eventName });
  }
}
