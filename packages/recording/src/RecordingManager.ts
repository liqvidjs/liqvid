import {bind} from "@liqvid/utils/misc";
import {EventEmitter} from "events";
import type StrictEventEmitter from "strict-event-emitter-types";

import type {IntransigentReturn, Recorder} from "./recorder";

interface EventTypes {
  cancel: void;
  capture: (key: string, data: unknown) => void;
  finalize: (key: string, data: unknown) => void;
  pause: void;
  resume: void;
  start: void;
}

/**
 * Class for managing recording sessions.
 */
export class RecordingManager extends (EventEmitter as unknown as new () => StrictEventEmitter<
  EventEmitter,
  EventTypes
>) {
  /** Whether recording is currently in progress. */
  active: boolean;

  /** Duration of recording. */
  duration: number;

  /** Whether recording is currently paused. */
  paused: boolean;

  /** Time when recording began. */
  private baseTime: number;

  private captureData: {
    [key: string]: unknown[];
  };

  private plugins: Record<string, Recorder<unknown, unknown>>;

  private intransigentRecorder: Recorder<unknown, unknown>;

  /** Time when last paused. */
  private lastPauseTime: number;

  /** Total duration that recording has been paused. */
  private pauseTime: number;

  constructor() {
    super();

    this.captureData = {};

    this.setMaxListeners(0);

    this.paused = false;
    this.active = false;

    bind(this, [
      "beginRecording",
      "endRecording",
      "pauseRecording",
      "resumeRecording",
      "capture",
    ]);
  }

  /**
   * Begin recording.
   *
   * @emits start
   */
  beginRecording(plugins: Record<string, Recorder<unknown, unknown>>): void {
    this.plugins = plugins;

    // initialize
    this.pauseTime = 0;
    this.intransigentRecorder = void 0;

    // dependency injection for plugins
    for (const key in this.plugins) {
      const recorder = this.plugins[key];

      recorder.provide({
        push: (value: unknown) => this.capture(key, value),
        manager: this,
      });

      this.captureData[key] = [];

      if (recorder.intransigent) {
        if (this.intransigentRecorder)
          throw new Error("At most one intransigent recorder is allowed");
        this.intransigentRecorder = recorder;
      }
    }

    // call this as close as possible to beginRecording() to minimize "lag"
    this.baseTime = performance.now();
    for (const key in this.plugins) {
      this.plugins[key].beginRecording();
    }

    this.paused = false;
    this.active = true;

    this.emit("start");
  }

  /**
   * Commit a piece of recording data.
   * @param key Key for recording source.
   * @param value Data to record.
   *
   * @emits capture
   */
  capture(key: string, value: unknown): void {
    this.captureData[key].push(value);

    this.emit("capture", key, value);
  }

  /**
   * End recording and collect finalized data from recorders.
   *
   * @emits finalize
   */
  async endRecording(): Promise<unknown> {
    const endTime = this.getTime();
    this.duration = endTime;
    const recording: Record<string, unknown> = {};

    let startDelay = 0,
      stopDelay = 0;

    let promise;

    // stop intransigentRecorder
    if (this.intransigentRecorder) {
      promise =
        this.intransigentRecorder.endRecording() as Promise<IntransigentReturn>;
    }

    // stop other recorders
    for (const key in this.plugins) {
      if (this.plugins[key] === this.intransigentRecorder) continue;
      this.plugins[key].endRecording();
    }

    // get start/stop delays from intransigentRecorder
    if (this.intransigentRecorder) {
      try {
        const [startTime, stopTime] = await promise;
        startDelay = startTime;
        stopDelay = stopTime - endTime;
        this.duration = this.duration + stopDelay - startDelay;
      } catch (e) {
        startDelay = 0;
        stopDelay = 0;
        console.error(e);
      }
    }

    // finalize
    for (const key in this.plugins) {
      recording[key] = this.plugins[key].finalizeRecording(
        this.captureData[key],
        startDelay,
        stopDelay,
      );
      this.emit("finalize", key, recording[key]);
    }

    this.active = false;

    this.emit("finalize", undefined, undefined);

    return recording;
  }

  /** Get current recording time. */
  getTime(): number {
    return performance.now() - this.baseTime - this.pauseTime;
  }

  /**
   * Pause recording.
   *
   * @emits pause
   */
  pauseRecording(): void {
    this.lastPauseTime = performance.now();

    for (const key in this.plugins) {
      this.plugins[key].pauseRecording();
    }

    this.paused = true;
    this.emit("pause");
  }

  /**
   * Resume recording from paused state.
   *
   * @emits resume
   */
  resumeRecording(): void {
    this.pauseTime += performance.now() - this.lastPauseTime;

    for (const key in this.plugins) {
      this.plugins[key].resumeRecording();
    }

    this.paused = false;
    this.emit("resume");
  }
}
