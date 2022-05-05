import {Recorder, IntransigentReturn} from "../recorder";
import type {RecorderPlugin} from "../types";

const icon = (
  <path fill="#FFF" d="M35.113 14.703a4.558 4.558 0 0 0-4.568 4.568v2.338h-11.29A13.146 13.146 0 0 0 6.082 34.787v37.018a13.142 13.142 0 0 0 13.173 13.172H80.74a13.147 13.147 0 0 0 13.178-13.172V34.787A13.146 13.146 0 0 0 80.74 21.61H69.455v-2.338a4.558 4.558 0 0 0-4.568-4.568H35.113ZM50 31.196c12.18 0 22.103 9.917 22.103 22.097 0 12.18-9.923 22.103-22.103 22.103-12.181 0-22.103-9.923-22.103-22.103 0-12.18 9.922-22.097 22.103-22.097Zm-30.073.835a4.59 4.59 0 0 1 4.59 4.59h.006a4.59 4.59 0 1 1-4.595-4.59ZM50 35.536a17.721 17.721 0 0 0-17.757 17.757A17.722 17.722 0 0 0 50 71.05a17.723 17.723 0 0 0 17.757-17.757A17.722 17.722 0 0 0 50 35.536Z"/>
);

export class VideoRecorder extends Recorder<Blob, Blob> {
  private mediaRecorder: MediaRecorder;
  private promise: Promise<IntransigentReturn>;

  private baseTime: number;
  private blob: Blob;

  stream: MediaStream;
  private requested = false;
  private startTime: number;
  private endTime: number;

  intransigent = true;

  beginRecording() {
    if (!this.stream)
      throw new Error("Navigator stream not available");

    this.promise = new Promise(async (resolve) => {
      // record the video
      this.mediaRecorder = new MediaRecorder(this.stream, {mimeType: "video/webm"});

      // subscribe to events
      this.mediaRecorder.addEventListener("dataavailable", e => {
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
    return new Blob(chunks, {type: "video/webm"});
  }

  requestRecording() {
    // be idempotent
    if (this.requested)
      return;
    
    const request = async () => {
      // Only need to do this once...
      window.removeEventListener("click", request);
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
      } catch (e) {
        // User said no or browser rejected request due to insecure context
        console.log("no recording allowed");
      }
    };

    // Need user interaction to request media
    window.addEventListener("click", request);
  }
}

export function VideoSaveComponent(props: {data: Blob}) {
  return (
    <>
      {props.data ?
        <a download="video.webm" href={URL.createObjectURL(props.data)}>Download Video</a>
        :
        "Video not yet available"
      }
    </>
  );
}

const recorder = new VideoRecorder();
export const VideoRecording: RecorderPlugin<Blob, Blob, VideoRecorder> = {
  enabled: () => {
    if (typeof recorder.stream === "undefined") {
      recorder.requestRecording();
      return false;
    }
    return true;
  },
  icon,
  key: "video",
  name: "Video",
  recorder,
  saveComponent: VideoSaveComponent,
  title: "Record video"
};
