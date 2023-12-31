import type {RecordingManager} from "./RecordingManager.js";

export type IntransigentReturn = [number, number];

/**
 * Abstract class for recording interactions.
 */
export abstract class Recorder<T = unknown, F = T[]> {
  protected manager: RecordingManager;

  /**
   * A recorder is intransigent if it cannot be started immediately (e.g. AudioRecorder).
   */
  intransigent = false;

  /** Begin recording. */
  beginRecording(): void {}

  /** Pause recording. */
  pauseRecording(): void {}

  /** Resume recording from paused. */
  resumeRecording(): void {}

  /** End recording. */
  endRecording(): Promise<IntransigentReturn> | void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  finalizeRecording(data: T[], startDelay = 0, stopDelay = 0): F {
    return data as unknown as F;
  }

  push: (value: T) => void;

  provide({
    push,
    manager,
  }: {
    push: (value: T) => void;
    manager: RecordingManager;
  }) {
    this.push = push;
    this.manager = manager;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUpdate(data: T[], lastDuration: number) {}
}
