import { EventEmitter } from "@liqvid/event-emitter";
import { isClient } from "@liqvid/ssr";
import { bind, constrain } from "@liqvid/utils";

import {
  SyntheticTextTrack,
  SyntheticTextTrackList,
  type TextTrackKind,
} from "./text-track.mts";

export type PlaybackEvent =
  | "audiocontextchange"
  | "bufferupdate"
  | "durationchange"
  | "pause"
  | "play"
  | "ratechange"
  | "seek"
  | "seeked"
  | "seeking"
  | "stop"
  | "timeupdate"
  | "volumechange";

export type PlaybackEventsMap = {
  [key in PlaybackEvent]: {
    target: CorePlayback;
    type: key;
  };
};

declare let webkitAudioContext: typeof AudioContext;

/**
 * Audio source registration for offline rendering.
 */
export interface AudioSourceRegistration {
  /** The decoded audio buffer */
  buffer: AudioBuffer;
  /** Start time in seconds (when the audio begins in the timeline) */
  startTime: number;
}

/**
 * Progress callback for offline rendering.
 */
export type OfflineRenderProgress = (progress: number) => void;

/**
 * Class pretending to be a media element advancing in time.
 *
 * Imitates {@link HTMLMediaElement} to a certain extent, although it does not implement that interface.
 */
export class CorePlayback extends EventEmitter<PlaybackEventsMap> {
  /** Audio context owned by this playback */
  audioContext: AudioContext | undefined;

  /** Audio node owned by this playback */
  audioNode: GainNode | undefined;

  /** Flag indicating whether playback is currently paused. */
  paused = true;

  /**
   * The list of text tracks associated with this playback.
   * Behaves like {@link HTMLMediaElement.textTracks}.
   */
  readonly textTracks: SyntheticTextTrackList;

  /**
   * Registered audio sources for offline rendering.
   * Audio components should register their decoded buffers here.
   */
  readonly audioSources: Set<AudioSourceRegistration> = new Set();

  /* private fields */
  private __playingFromMs = 0;
  private __startTimeMs = performance.now();

  /* private fields exposed by getters */
  private __currentTimeMs = 0;
  private __durationMs = 0;
  private __muted = false;
  private __playbackRate = 1;
  private __seeking = false;
  private __volume = 1;

  constructor() {
    super();

    // initialize text tracks
    this.textTracks = new SyntheticTextTrackList();

    // bind methods
    bind(this, ["pause", "play"]);
    this.__advance = this.__advance.bind(this);

    // browser-only
    if (isClient) {
      // audio
      this.__initAudio();

      // initiate playback loop
      requestAnimationFrame(this.__advance);
    }
  }

  /* magic properties */

  get currentTime() {
    return this.__currentTimeMs / 1000;
  }

  set currentTime(t: number) {
    t = constrain(0, t, this.duration);
    if (t === this.currentTime) return;

    this.__currentTimeMs = this.__playingFromMs = t * 1000;
    this.__startTimeMs = performance.now();

    this.__emit("seeking");
    this.__emit("timeupdate");
    this.__emit("seeked");

    // Update text tracks after seek
    this.__updateTextTracks();

    if (this.currentTime >= this.duration) {
      this.stop();
    }
  }

  /**
   * Length of the playback in seconds.
   */
  get duration(): number {
    return this.__durationMs / 1000;
  }

  /** @emits durationchange */
  set duration(duration: number) {
    if (duration === this.duration) return;

    this.__durationMs = duration * 1000;
    this.__emit("durationchange");
  }

  /** Gets or sets a flag that indicates whether playback is muted. */
  get muted(): boolean {
    return this.__muted;
  }

  /** @emits volumechange */
  set muted(val: boolean) {
    if (val === this.__muted) return;

    this.__muted = val;

    if (this.audioNode && this.audioContext) {
      if (this.__muted) {
        this.audioNode.gain.value = 0;
      } else {
        this.audioNode.gain.setValueAtTime(
          this.volume,
          this.audioContext.currentTime,
        );
      }
    }

    this.__emit("volumechange");
  }

  /** Gets or sets the current rate of speed for the playback. */
  get playbackRate(): number {
    return this.__playbackRate;
  }

  /** @emits ratechange */
  set playbackRate(val: number) {
    if (val === this.__playbackRate) return;

    this.__playbackRate = val;
    this.__playingFromMs = this.currentTime * 1000;
    this.__startTimeMs = performance.now();
    this.__emit("ratechange");
  }

  /** Gets or sets a flag that indicates whether the playback is currently moving to a new position. */
  get seeking(): boolean {
    return this.__seeking;
  }

  /**
   * @emits seeking
   * @emits seeked
   */
  set seeking(val: boolean) {
    if (val === this.__seeking) return;

    this.__seeking = val;
    if (this.__seeking) this.__emit("seeking");
    else this.__emit("seeked");
  }

  /**
   * Pause playback.
   *
   * @emits pause
   */
  pause(): void {
    this.paused = true;
    this.__playingFromMs = this.currentTime * 1000;

    this.__emit("pause");
  }

  /**
   * Start or resume playback.
   *
   * @emits play
   */
  play(): void {
    this.paused = false;

    // this is necessary for currentTime to be correct when playing from stop state
    this.__currentTimeMs = this.__playingFromMs;
    this.__startTimeMs = performance.now();

    this.__emit("play");
  }

  /** Gets or sets the volume level for the playback. */
  get volume(): number {
    return this.__volume;
  }

  /** @emits volumechange */
  set volume(volume: number) {
    const prevVolume = this.__volume;
    this.__volume = constrain(0, volume, 1);

    if (this.audioNode && this.audioContext) {
      if (prevVolume === 0 || this.__volume === 0) {
        this.audioNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      } else {
        this.audioNode.gain.exponentialRampToValueAtTime(
          this.__volume,
          this.audioContext.currentTime + 2,
        );
      }
    }

    this.__emit("volumechange");
  }

  /**
   * Stop playback and reset pointer to start
   *
   * @emits stop
   */
  stop(): void {
    this.paused = true;
    this.__playingFromMs = 0;

    this.__emit("stop");
  }

  /**
   * Add a new text track to the playback.
   * Behaves like {@link HTMLMediaElement.addTextTrack}.
   *
   * @param kind - The kind of text track (subtitles, captions, etc.)
   * @param label - A human-readable label for the track
   * @param language - The BCP 47 language tag for the track
   * @returns The newly created text track
   */
  addTextTrack(
    kind: TextTrackKind,
    label?: string,
    language?: string,
  ): SyntheticTextTrack {
    const track = new SyntheticTextTrack(kind, label ?? "", language ?? "");
    this.textTracks.__add(track);
    return track;
  }

  /**
   * Remove a text track from the playback.
   * Note: This method is not part of the standard HTMLMediaElement API,
   * but is provided for convenience.
   *
   * @param track - The track to remove
   */
  removeTextTrack(track: SyntheticTextTrack): void {
    this.textTracks.__remove(track);
  }

  /**
   * Register an audio source for offline rendering.
   * Audio components should call this after decoding their audio buffers.
   *
   * @param registration - The audio source registration
   */
  registerAudioSource(registration: AudioSourceRegistration): void {
    this.audioSources.add(registration);
  }

  /**
   * Unregister an audio source from offline rendering.
   *
   * @param registration - The audio source registration to remove
   */
  unregisterAudioSource(registration: AudioSourceRegistration): void {
    this.audioSources.delete(registration);
  }

  /**
   * Render all registered audio sources to an AudioBuffer using OfflineAudioContext.
   * This renders as fast as possible (not real-time).
   *
   * @param onProgress - Optional callback for progress updates (0-1)
   * @returns The rendered audio buffer
   */
  async renderOffline(
    onProgress?: OfflineRenderProgress,
  ): Promise<AudioBuffer> {
    if (!isClient) {
      throw new Error("renderOffline can only be called in the browser");
    }

    const sampleRate = 44100;
    const numberOfChannels = 2;
    const lengthInSamples = Math.ceil(this.duration * sampleRate);

    if (lengthInSamples === 0) {
      throw new Error("Cannot render audio: duration is 0");
    }

    // Create offline audio context
    const offlineContext = new OfflineAudioContext(
      numberOfChannels,
      lengthInSamples,
      sampleRate,
    );

    // Create a master gain node
    const masterGain = offlineContext.createGain();
    masterGain.connect(offlineContext.destination);

    // Schedule all registered audio sources
    for (const registration of this.audioSources) {
      const { buffer, startTime } = registration;

      // Skip if the audio starts after the playback ends
      if (startTime >= this.duration) continue;

      // Create a buffer source for each registered audio
      const sourceNode = offlineContext.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(masterGain);

      // Calculate when to start (in samples)
      const startTimeInContext = Math.max(0, startTime);

      // Calculate offset within the buffer (if startTime is negative)
      const offsetInBuffer = startTime < 0 ? -startTime : 0;

      // Calculate how long to play
      const maxDuration = this.duration - startTimeInContext;
      const bufferDuration = buffer.duration - offsetInBuffer;
      const playDuration = Math.min(maxDuration, bufferDuration);

      if (playDuration > 0) {
        sourceNode.start(startTimeInContext, offsetInBuffer, playDuration);
      }
    }

    // Render the audio
    if (onProgress) {
      // OfflineAudioContext doesn't have native progress events,
      // so we estimate progress based on time
      const startRenderTime = performance.now();
      const estimatedRenderTime = this.duration * 100; // rough estimate: 100ms per second of audio

      const progressInterval = setInterval(() => {
        const elapsed = performance.now() - startRenderTime;
        const progress = Math.min(elapsed / estimatedRenderTime, 0.99);
        onProgress(progress);
      }, 100);

      try {
        const renderedBuffer = await offlineContext.startRendering();
        clearInterval(progressInterval);
        onProgress(1);
        return renderedBuffer;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    }

    return offlineContext.startRendering();
  }

  /**
   * Render all registered audio sources and return as a Blob.
   * This encodes the audio as WAV format.
   *
   * @param onProgress - Optional callback for progress updates (0-1)
   * @returns The rendered audio as a WAV Blob
   */
  async renderOfflineAsWav(onProgress?: OfflineRenderProgress): Promise<Blob> {
    const audioBuffer = await this.renderOffline(onProgress);
    return audioBufferToWav(audioBuffer);
  }

  /* private methods */

  /**
   * @emits timeupdate
   * @emits cuechange
   */
  private __advance(t: number): void {
    // paused
    if (this.paused || this.__seeking) {
      this.__startTimeMs = t;
    } else {
      // playing
      this.__currentTimeMs =
        this.__playingFromMs +
        Math.max((t - this.__startTimeMs) * this.__playbackRate, 0);

      if (this.__currentTimeMs >= this.__durationMs) {
        this.__currentTimeMs = this.__durationMs;
        this.stop();
      }

      this.__emit("timeupdate");

      // Update active cues on text tracks
      this.__updateTextTracks();
    }

    requestAnimationFrame(this.__advance);
  }

  /**
   * Update active cues on all text tracks.
   * @emits cuechange
   */
  private __updateTextTracks(): void {
    const currentTime = this.currentTime;

    for (const track of this.textTracks) {
      if (track.mode !== "disabled") {
        track.__updateActiveCues(currentTime);
      }
    }
  }

  /**
   * Try to initiate audio
   *
   * @listens click
   * @listens keydown
   * @listens touchstart
   * @emits audiocontextchange
   */
  private __initAudio(): void {
    const requestAudioContext = (): void => {
      try {
        this.audioContext = new (window.AudioContext || webkitAudioContext)();
        this.audioNode = this.audioContext.createGain();
        this.audioNode.connect(this.audioContext.destination);

        window.removeEventListener("click", requestAudioContext);
        window.removeEventListener("load", requestAudioContext);
        window.removeEventListener("mousemove", requestAudioContext);
        window.removeEventListener("keydown", requestAudioContext);
        window.removeEventListener("touchstart", requestAudioContext);

        this.__emit("audiocontextchange");
      } catch (e) {
        console.error("Failed to create audio context", e);
      }
    };
    window.addEventListener("click", requestAudioContext);
    window.addEventListener("load", requestAudioContext);
    window.addEventListener("mousemove", requestAudioContext);
    window.addEventListener("keydown", requestAudioContext);
    window.addEventListener("touchstart", requestAudioContext);
  }

  private __emit(eventName: PlaybackEvent) {
    this.emit(eventName, { target: this, type: eventName });
  }
}

/**
 * Convert an AudioBuffer to a WAV Blob.
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  // Interleave channels
  const interleaved = interleaveChannels(buffer);
  const dataLength = interleaved.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write audio data
  const offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset + i * 2, intSample, true);
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function interleaveChannels(buffer: AudioBuffer): Float32Array {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const result = new Float32Array(length * numberOfChannels);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numberOfChannels; c++) {
      result[i * numberOfChannels + c] = channels[c][i];
    }
  }

  return result;
}
