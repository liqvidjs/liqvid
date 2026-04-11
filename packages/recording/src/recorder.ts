/**
 * Abstract interface for recording interactions.
 */
export interface Recorder<
  Datum = unknown,
  FinalData = Datum[],
  Config = unknown,
> {
  configure?(configuration: Config): void;

  /** Begin recording. */
  beginRecording?(timestamp?: number): void;

  /** Pause recording. */
  pauseRecording?(timestamp?: number): void;

  /** Resume recording from paused. */
  resumeRecording?(): void;

  /** End recording. */
  endRecording?(): void;

  /**
   * Finalize recording and return the final data.
   * Can be async for recorders that need to wait for data (e.g., MediaRecorder).
   */
  finalizeRecording(): FinalData | Promise<FinalData>;
}
