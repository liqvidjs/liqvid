// Worker-safe: must not import React or DOM-only code.
import {
  EncodedPacketSink,
  HLS_FORMATS,
  Input,
  type InputVideoTrack,
  UrlSource,
  type VideoSample,
  VideoSampleSink,
} from "mediabunny";

import type { HlsSegment } from "./segments.ts";
import { getHlsSegments, mergeHlsSegments } from "./segments.ts";

// HTMLMediaElement is not available in workers.
export const ReadyState = {
  HAVE_CURRENT_DATA: 2,
  HAVE_ENOUGH_DATA: 4,
  HAVE_METADATA: 1,
  HAVE_NOTHING: 0,
} as const;

/**
 * When decoding falls this far behind the target time, check whether jumping
 * to the nearest key frame is cheaper than decoding every frame in between.
 */
const CATCH_UP_THRESHOLD = 0.5;

export type FrameRenderer = Readonly<{
  dispose: () => void;
  /** Advance to a later time by decoding sequentially. */
  render: (timestamp: number) => void;
  /**
   * Jump to an arbitrary time.
   * @param playing Whether playback continues from there, so following frames
   * should be decoded ahead of time.
   */
  seek: (timestamp: number, playing: boolean) => void;
}>;

export type FrameSessionOptions = Readonly<{
  /**
   * Draw a sample. The sample is closed after this returns.
   * @returns whether the sample was drawn
   */
  draw: (sample: VideoSample) => boolean;
  initialTimestamp: number;
  onError: (message: string, error: unknown) => void;
  onBuffered: (ranges: readonly (readonly [number, number])[]) => void;
  onReadyState: (readyState: number) => void;
  /** Seconds ahead to preload; undefined means the next HLS segment. */
  preload?: number;
  /** Absolute URL of the HLS playlist. */
  source: string;
}>;

/**
 * Load an HLS stream and draw the frame at the requested time. Media time is
 * relative to the start of the stream.
 */
export function createFrameSession(
  options: FrameSessionOptions,
): FrameRenderer {
  const input = new Input({
    formats: HLS_FORMATS,
    source: new UrlSource(options.source),
  });
  let disposed = false;
  let session: SequentialFrameSession | null = null;

  // The session starts at the latest requested time once the track loads.
  let lastTimestamp = options.initialTimestamp;
  let settledBySeek = true;

  options.onReadyState(ReadyState.HAVE_NOTHING);

  void (async () => {
    const track = await input.getPrimaryVideoTrack();
    if (disposed) return;
    if (!track) {
      options.onReadyState(ReadyState.HAVE_ENOUGH_DATA);
      return;
    }
    const firstTimestamp = await track.getFirstTimestamp();
    if (disposed) return;

    session = new SequentialFrameSession({
      ...options,
      firstTimestamp,
      initialTimestamp: lastTimestamp,
      segments: [],
      track,
    });
    void getHlsSegments(options.source)
      .then((segments) => session?.setSegments(segments))
      .catch((error: unknown) => {
        if (!disposed) console.warn("Failed to read HLS segment ranges", error);
      });
  })().catch((error: unknown) => {
    if (disposed) return;
    options.onError("Failed to load HLS video", error);
  });

  return {
    dispose() {
      disposed = true;
      session?.dispose();
      input.dispose();
    },
    render(timestamp) {
      if (timestamp === lastTimestamp) return;
      if (timestamp < lastTimestamp) {
        session?.seek(timestamp, true);
        settledBySeek = true;
      } else {
        session?.render(timestamp);
        settledBySeek = false;
      }
      lastTimestamp = timestamp;
    },
    seek(timestamp, playing) {
      // A sequential render to this timestamp must not swallow the seek.
      // Otherwise releasing the scrubber continues the frame walk.
      if (timestamp === lastTimestamp && settledBySeek) return;
      session?.seek(timestamp, playing);
      lastTimestamp = timestamp;
      settledBySeek = true;
    },
  };
}

type SeekRequest = Readonly<{
  prefetch: boolean;
  timestamp: number;
  version: number;
}>;

class SequentialFrameSession {
  private __active = true;
  private __targetVersion = 0;
  private __target: number;
  private __seekRequest: SeekRequest | null;
  /** First timestamp to decode sequentially from once playback advances. */
  private __sequenceStart: number | null = null;
  private __pendingSample: VideoSample | null = null;
  private __iterator: AsyncGenerator<VideoSample, void, unknown> | null = null;
  private __catchUpCheckedAt = Number.NEGATIVE_INFINITY;
  private __wake: (() => void) | null = null;
  private readonly __sink: VideoSampleSink;
  private readonly __packets: EncodedPacketSink;
  private readonly __loadedSegments = new Set<number>();
  private __preloadVersion = 0;
  private __preloadKey = "";
  private __segments: readonly HlsSegment[];

  constructor(
    private readonly __options: FrameSessionOptions & {
      firstTimestamp: number;
      segments: readonly HlsSegment[];
      track: InputVideoTrack;
    },
  ) {
    this.__segments = __options.segments;
    this.__sink = new VideoSampleSink(__options.track);
    this.__packets = new EncodedPacketSink(__options.track);
    this.__target = this.__toTrackTimestamp(__options.initialTimestamp);
    this.__seekRequest = {
      prefetch: false,
      timestamp: this.__target,
      version: this.__targetVersion,
    };
    void this.__run();
  }

  dispose(): void {
    this.__active = false;
    this.__seekRequest = null;
    this.__resetSequence();
    this.__wakeForUpdate();
  }

  setSegments(segments: readonly HlsSegment[]): void {
    this.__segments = segments;
    this.__preloadKey = "";
    this.__preload(this.__target - this.__options.firstTimestamp);
  }

  render(timestamp: number): void {
    if (!this.__active) return;
    this.__target = this.__toTrackTimestamp(timestamp);
    this.__preload(timestamp);
    // Playback keeps ticking during a seek. Bumping the version here would
    // drop the seeked frame when it arrives.
    this.__wakeForUpdate();
  }

  seek(timestamp: number, playing: boolean): void {
    if (!this.__active) return;
    this.__target = this.__toTrackTimestamp(timestamp);
    this.__preload(timestamp);
    this.__targetVersion += 1;
    this.__requestSeek({
      prefetch: playing,
      timestamp: this.__target,
      version: this.__targetVersion,
    });
  }

  private __requestSeek(request: SeekRequest): void {
    this.__seekRequest = request;
    this.__resetSequence();
    this.__wakeForUpdate();
  }

  private async __run(): Promise<void> {
    while (this.__active) {
      try {
        await this.__processStep();
      } catch (error) {
        if (!this.__active) return;
        if (this.__seekRequest) continue;
        this.__options.onError("Failed to process HLS video frame", error);
        return;
      }
    }
  }

  private async __processStep(): Promise<void> {
    if (this.__seekRequest) {
      await this.__seekToRequest(this.__seekRequest);
      return;
    }
    // Only start decoding ahead once playback actually moves past the
    // sought frame; scrubbing would otherwise throw that work away.
    if (
      !this.__iterator &&
      this.__sequenceStart !== null &&
      this.__target >= this.__sequenceStart
    ) {
      this.__iterator = this.__sink.samples(this.__sequenceStart);
      this.__sequenceStart = null;
    }
    if (this.__iterator) {
      await this.__processNextFrame(this.__iterator);
      return;
    }
    await this.__waitForUpdate();
  }

  private __isStale(iterator: AsyncGenerator<VideoSample>): boolean {
    return (
      !this.__active ||
      this.__seekRequest !== null ||
      iterator !== this.__iterator
    );
  }

  private async __next(
    iterator: AsyncGenerator<VideoSample, void, unknown>,
  ): Promise<VideoSample | null> {
    const result = await iterator.next();
    if (this.__isStale(iterator)) {
      result.value?.close();
      return null;
    }
    if (result.done) {
      this.__iterator = null;
      return null;
    }
    return result.value;
  }

  private async __processNextFrame(
    iterator: AsyncGenerator<VideoSample, void, unknown>,
  ): Promise<void> {
    let sample = this.__pendingSample;
    this.__pendingSample = null;
    sample ??= await this.__next(iterator);
    if (!sample) return;

    if (sample.timestamp > this.__target) {
      this.__pendingSample = sample;
      await this.__waitForUpdate();
      return;
    }

    if (await this.__shouldJumpAhead(sample, iterator)) {
      sample.close();
      if (!this.__isStale(iterator)) {
        this.__requestSeek({
          prefetch: true,
          timestamp: this.__target,
          version: this.__targetVersion,
        });
      }
      return;
    }
    if (this.__isStale(iterator)) {
      sample.close();
      return;
    }

    // When decoding has fallen behind, skip straight to the newest frame
    // that is due instead of drawing every stale frame on the way.
    while (true) {
      const next = await this.__next(iterator);
      if (!next) {
        if (this.__isStale(iterator)) {
          sample.close();
          return;
        }
        break;
      }
      if (next.timestamp > this.__target) {
        this.__pendingSample = next;
        break;
      }
      sample.close();
      sample = next;
    }

    this.__draw(sample);
  }

  private async __shouldJumpAhead(
    sample: VideoSample,
    iterator: AsyncGenerator<VideoSample>,
  ): Promise<boolean> {
    const target = this.__target;
    if (target - sample.timestamp < CATCH_UP_THRESHOLD) return false;
    if (target - this.__catchUpCheckedAt < CATCH_UP_THRESHOLD) return false;
    this.__catchUpCheckedAt = target;

    // A seek decodes from the key frame at or before the target, so it only
    // saves work when that key frame is ahead of the current position.
    const keyPacket = await this.__packets.getKeyPacket(target, {
      metadataOnly: true,
    });
    if (this.__isStale(iterator)) return false;
    return keyPacket !== null && keyPacket.timestamp > sample.timestamp;
  }

  private async __seekToRequest(request: SeekRequest): Promise<void> {
    this.__seekRequest = null;
    this.__catchUpCheckedAt = Number.NEGATIVE_INFINITY;

    let sample: VideoSample | null;
    try {
      sample = await this.__sink.getSample(request.timestamp);
    } catch (error) {
      if (!this.__active || this.__seekRequest) return;
      this.__options.onError("Failed to seek HLS video", error);
      return;
    }
    // A newer seek supersedes this one.
    if (!this.__active || this.__seekRequest) {
      sample?.close();
      return;
    }

    const sequenceStart = sample
      ? sample.timestamp + sample.duration
      : request.timestamp;
    if (
      sample &&
      sample.timestamp <= this.__target &&
      request.version === this.__targetVersion
    ) {
      this.__draw(sample);
    } else {
      sample?.close();
    }

    if (request.prefetch) {
      this.__iterator = this.__sink.samples(sequenceStart);
    } else {
      this.__sequenceStart = sequenceStart;
    }
  }

  private async __waitForUpdate(): Promise<void> {
    if (!this.__active || this.__seekRequest !== null) return;
    await new Promise<void>((resolve) => {
      this.__wake = resolve;
    });
  }

  private __wakeForUpdate(): void {
    const wake = this.__wake;
    this.__wake = null;
    wake?.();
  }

  private __resetSequence(): void {
    this.__sequenceStart = null;
    this.__pendingSample?.close();
    this.__pendingSample = null;

    const iterator = this.__iterator;
    this.__iterator = null;
    void iterator?.return().catch((error: unknown) => {
      if (this.__active) {
        this.__options.onError("Failed to stop HLS frame iteration", error);
      }
    });
  }

  private __draw(sample: VideoSample): void {
    try {
      const didDraw = this.__options.draw(sample);
      this.__markSegmentLoaded(
        sample.timestamp - this.__options.firstTimestamp,
      );
      this.__options.onReadyState(
        didDraw ? ReadyState.HAVE_CURRENT_DATA : ReadyState.HAVE_ENOUGH_DATA,
      );
    } finally {
      sample.close();
    }
  }

  private __toTrackTimestamp(timestamp: number): number {
    return this.__options.firstTimestamp + Math.max(0, timestamp);
  }

  private __markSegmentLoaded(timestamp: number): void {
    const index = this.__segments.findIndex(({ end }) => timestamp < end);
    if (index === -1 || this.__loadedSegments.has(index)) return;
    this.__loadedSegments.add(index);
    this.__reportBuffered();
    this.__preload(timestamp);
  }

  private __preload(timestamp: number): void {
    const segments = this.__segments;
    if (segments.length === 0) return;
    const currentIndex = segments.findIndex(({ end }) => timestamp < end);
    if (currentIndex === -1) return;

    const endTime =
      this.__options.preload === undefined
        ? undefined
        : timestamp + this.__options.preload;
    const requestedEndIndex =
      endTime === undefined
        ? Math.min(currentIndex + 1, segments.length - 1)
        : segments.findIndex(({ end }) => endTime <= end);
    const lastIndex =
      requestedEndIndex === -1
        ? segments.length - 1
        : Math.max(currentIndex, requestedEndIndex);
    const preloadKey = `${currentIndex}:${lastIndex}`;
    if (preloadKey === this.__preloadKey) return;
    this.__preloadKey = preloadKey;
    const version = ++this.__preloadVersion;

    void (async () => {
      for (let index = currentIndex; index <= lastIndex; index += 1) {
        if (version !== this.__preloadVersion || !this.__active) return;
        if (this.__loadedSegments.has(index)) continue;

        const segment = segments[index]!;
        const middle = (segment.start + segment.end) / 2;
        const packet = await this.__packets.getPacket(
          this.__toTrackTimestamp(middle),
        );
        if (version !== this.__preloadVersion || !this.__active) return;
        if (!packet) continue;

        this.__loadedSegments.add(index);
        this.__reportBuffered();
      }
    })().catch((error: unknown) => {
      if (this.__active && version === this.__preloadVersion) {
        this.__options.onError("Failed to preload HLS segment", error);
      }
    });
  }

  private __reportBuffered(): void {
    this.__options.onBuffered(
      mergeHlsSegments(this.__loadedSegments, this.__segments),
    );
  }
}
