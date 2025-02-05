import {isClient} from "@liqvid/utils/ssr";

import {type IntransigentReturn, Recorder} from "../recorder";
import type {RecorderPlugin} from "../types";

const icon = (
  <g transform="scale(0.126261032057) translate(164.575)">
    <g stroke="#FFF" transform="translate(-140.62 -173.21)">
      <path
        d="m568.57 620.93c0 116.77-94.66 211.43-211.43 211.43s-211.43-94.66-211.43-211.43v-0.00001"
        fillOpacity="0"
        transform="translate(14.904)"
        strokeLinecap="round"
        strokeWidth="20"
      />
      <path
        d="m568.57 620.93c0 116.77-94.66 211.43-211.43 211.43s-211.43-94.66-211.43-211.43v-0.00001"
        fillOpacity="0"
        transform="translate(14.904)"
        strokeLinecap="round"
        strokeWidth="40"
      />
      <path d="m372.05 832.36v114.29" strokeWidth="30" fill="none" />
      <path
        fill="#FFF"
        d="m197.14 920.93c0.00001-18.935 59.482-34.286 132.86-34.286 73.375 0 132.86 15.35 132.86 34.286z"
        transform="translate(42.047 34.286)"
        strokeLinecap="round"
        strokeWidth="20"
      />
      <path
        fill="#FFF"
        strokeWidth="21.455"
        strokeLinecap="round"
        d="m372.06 183.94c-77.019-0.00001-139.47 62.45-139.47 139.47v289.62c0 77.019 62.45 139.47 139.47 139.47 77.019 0 139.44-62.45 139.44-139.47v-289.62c0-77.02-62.42-139.47-139.44-139.47z"
      />
    </g>
  </g>
);

export class AudioRecorder extends Recorder<Blob, Blob> {
  private mediaRecorder: MediaRecorder;
  private promise: Promise<IntransigentReturn>;

  stream: MediaStream;
  private requested = false;

  intransigent = true;

  beginRecording() {
    if (!this.stream) throw new Error("Navigator stream not available");

    this.promise = new Promise(async (resolve) => {
      // record the audio
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm",
      });

      // subscribe to events
      this.mediaRecorder.addEventListener("dataavailable", (e) => {
        this.push(e.data);
      });

      let startDelay: number;
      this.mediaRecorder.addEventListener("start", () => {
        startDelay = this.manager.getTime();
      });

      this.mediaRecorder.addEventListener("stop", () => {
        resolve([startDelay, this.manager.getTime()]);
      });

      this.mediaRecorder.start();
    });
  }

  pauseRecording() {
    this.mediaRecorder.pause();
  }

  resumeRecording() {
    this.mediaRecorder.resume();
  }

  async endRecording() {
    this.mediaRecorder.stop();
    return this.promise;
  }

  finalizeRecording(chunks: Blob[]) {
    return new Blob(chunks, {type: "audio/webm"});
  }

  requestRecording(constraints: MediaStreamConstraints = {audio: true}) {
    // be idempotent
    if (this.requested) return;

    const request = async () => {
      // Only need to do this once...
      window.removeEventListener("click", request);

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // User said no or browser rejected request due to insecure context
        console.log("no recording allowed");
      }
    };

    // Need user interaction to request media
    window.addEventListener("click", request);
    this.requested = true;
  }
}

export function AudioSaveComponent(props: {data: Blob}) {
  return (
    <>
      {props.data ? (
        <a download="audio.webm" href={URL.createObjectURL(props.data)}>
          Download Audio
        </a>
      ) : (
        "Audio not yet available"
      )}
    </>
  );
}

const recorder = new AudioRecorder();
export const AudioRecording: RecorderPlugin<Blob, Blob, AudioRecorder> = {
  enabled: () => {
    if (typeof recorder.stream === "undefined") {
      if (isClient) recorder.requestRecording();
      return false;
    }
    return true;
  },
  icon,
  key: "audio",
  name: "Audio",
  recorder,
  saveComponent: AudioSaveComponent,
  title: "Record audio",
};
