import type { Recorder } from "@liqvid/recording";

export interface MediaRecorderConfig {
  audioDeviceId?: string;
  videoDeviceId?: string;
}

export class LiqvidMediaRecorder
  implements Recorder<Blob, Blob, MediaRecorderConfig>
{
  private mediaRecorder: MediaRecorder | null = null;

  stream: MediaStream | null = null;
  private config: MediaRecorderConfig = {};

  private chunks: Blob[] = [];

  /**
   * Promise that resolves when the MediaRecorder has stopped and all data is available.
   * This is needed because MediaRecorder.stop() is asynchronous.
   */
  private stopPromise: Promise<void> | null = null;

  async configure(config: MediaRecorderConfig) {
    this.config = config;

    // Stop any existing stream tracks
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    const hasAudio = !!config.audioDeviceId;
    const hasVideo = !!config.videoDeviceId;

    if (!hasAudio && !hasVideo) {
      return;
    }

    const constraints: MediaStreamConstraints = {};

    if (hasAudio) {
      constraints.audio = { deviceId: { exact: config.audioDeviceId } };
    }

    if (hasVideo) {
      constraints.video = { deviceId: { exact: config.videoDeviceId } };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      console.error("Failed to acquire media stream:", e);
    }
  }

  private get isAudioOnly(): boolean {
    return !!this.config.audioDeviceId && !this.config.videoDeviceId;
  }

  private get mimeType(): string {
    return this.isAudioOnly ? "audio/webm" : "video/webm";
  }

  beginRecording() {
    if (!this.stream) throw new Error("Navigator stream not available");

    this.chunks = [];
    this.stopPromise = null;

    // record the media
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.mimeType,
    });

    // subscribe to events
    this.mediaRecorder.addEventListener("dataavailable", (e) => {
      this.chunks.push(e.data);
    });

    this.mediaRecorder.start();
  }

  pauseRecording() {
    this.mediaRecorder?.pause();
  }

  resumeRecording() {
    this.mediaRecorder?.resume();
  }

  endRecording() {
    if (!this.mediaRecorder) return;

    // Create a promise that resolves when the recorder stops
    this.stopPromise = new Promise<void>((resolve) => {
      this.mediaRecorder!.addEventListener("stop", () => resolve(), {
        once: true,
      });
    });

    this.mediaRecorder.stop();
  }

  /**
   * Finalize recording and return the blob.
   * Waits for the MediaRecorder to fully stop and emit all data.
   */
  async finalizeRecording(): Promise<Blob> {
    // Wait for the recorder to fully stop and emit all data
    if (this.stopPromise) {
      await this.stopPromise;
    }

    const blob = new Blob(this.chunks, { type: this.mimeType });
    this.chunks = [];
    return blob;
  }
}
