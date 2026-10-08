import type { DurationLike } from "@liqvid/duration";
import {
  usePlayback,
  usePlaybackEvent,
  useReadyStateItem,
} from "@liqvid/playback/react";
import { useStableDuration } from "@liqvid/utils";
import { CanvasSink, HLS_FORMATS, Input, UrlSource } from "mediabunny";
import { useEffect, useEffectEvent, useRef } from "react";

import {
  disposeGreenScreen,
  type GreenScreenConfig,
  renderGreenScreen,
} from "./greenscreen.ts";

type FrameRenderer = Readonly<{
  dispose: () => void;
  invalidate: () => void;
  render: (timestamp: number) => void;
  seek: (timestamp: number) => void;
}>;

type FrameSession = Pick<
  FrameRenderer,
  "dispose" | "invalidate" | "render" | "seek"
>;

type CanvasFrame = NonNullable<Awaited<ReturnType<CanvasSink["getCanvas"]>>>;

export function useMediaBunnyFrames({
  canvasRef,
  enabled,
  greenscreen,
  source,
  start,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  greenscreen: boolean | GreenScreenConfig;
  source?: string;
  start?: DurationLike;
}): void {
  const playback = usePlayback();
  const { setReadyState } = useReadyStateItem();
  const start$ = useStableDuration(start ?? {});
  const rendererRef = useRef<FrameRenderer | null>(null);

  const renderAtPlaybackTime$ = useEffectEvent(() => {
    if (playback.paused && !playback.seeking) return;
    const timestamp = playback.currentTime$.minus(start$).inSeconds();
    rendererRef.current?.render(timestamp);
  });
  const seekAtPlaybackTime$ = useEffectEvent(() => {
    const timestamp = playback.currentTime$.minus(start$).inSeconds();
    rendererRef.current?.seek(timestamp);
  });
  const renderAfterSeek$ = useEffectEvent(() => {
    if (playback.seeking) return;
    const timestamp = playback.currentTime$.minus(start$).inSeconds();
    rendererRef.current?.seek(timestamp);
  });
  useEffect(() => {
    if (!source || !enabled) return;

    setReadyState(HTMLMediaElement.HAVE_NOTHING);
    const input = new Input({
      formats: HLS_FORMATS,
      source: new UrlSource(source),
    });
    let active = true;

    void createFrameRenderer(
      input,
      canvasRef,
      greenscreen,
      setReadyState,
      playback.currentTime$.minus(start$).inSeconds(),
    )
      .then((renderer) => {
        if (!active) {
          renderer.dispose();
          return;
        }
        rendererRef.current = renderer;
      })
      .catch((error: unknown) => {
        if (!active) return;
        setReadyState(HTMLMediaElement.HAVE_ENOUGH_DATA);
        console.error("Failed to load HLS video with MediaBunny", error);
      });

    return () => {
      active = false;
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (greenscreen) disposeGreenScreen(canvasRef.current);
      setReadyState(HTMLMediaElement.HAVE_ENOUGH_DATA);
      input.dispose();
    };
  }, [
    canvasRef,
    enabled,
    greenscreen,
    playback,
    setReadyState,
    source,
    start$,
  ]);

  useFramePlaybackEvents(
    enabled,
    playback,
    renderAtPlaybackTime$,
    seekAtPlaybackTime$,
    renderAfterSeek$,
    setReadyState,
  );
}

function useFramePlaybackEvents(
  enabled: boolean,
  playback: ReturnType<typeof usePlayback>,
  onTimeChange: () => void,
  onSeekDuringScrub: () => void,
  onSeeked: () => void,
  setReadyState: (readyState: number) => void,
): void {
  // currentTime assignment emits seeking without setting playback.seeking.
  const programmaticSeek = useRef(false);

  usePlaybackEvent("timeupdate", () => {
    // Scrub moves and keyboard seeks must jump. Sequential render walks every
    // frame between the old and new time, including after the pointer is released.
    if (playback.seeking || programmaticSeek.current) {
      programmaticSeek.current = false;
      onSeekDuringScrub();
      return;
    }

    onTimeChange();
  });
  usePlaybackEvent("seeked", () => {
    programmaticSeek.current = false;
    if (playback.seeking) return;
    onSeeked();
  });
  usePlaybackEvent("seeking", () => {
    if (!playback.seeking) programmaticSeek.current = true;
    if (!enabled) return;
    setReadyState(HTMLMediaElement.HAVE_METADATA);
  });
}

async function createFrameRenderer(
  input: Input,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  greenscreen: boolean | GreenScreenConfig,
  setReadyState: (readyState: number) => void,
  initialTimestamp: number,
): Promise<FrameRenderer> {
  const track = await input.getPrimaryVideoTrack();
  if (!track) {
    setReadyState(HTMLMediaElement.HAVE_ENOUGH_DATA);
    return {
      dispose: () => {},
      invalidate: () => {},
      render: () => {},
      seek: () => {},
    };
  }

  const firstTimestamp = await track.getFirstTimestamp();
  const session = new SequentialFrameSession({
    canvasRef,
    firstTimestamp,
    greenscreen,
    initialTimestamp,
    setReadyState,
    track,
  });
  let lastTimestamp = initialTimestamp;
  let settledBySeek = true;

  return {
    dispose: () => session.dispose(),
    invalidate: () => session.invalidate(),
    render: (timestamp) => {
      if (timestamp === lastTimestamp) return;
      if (timestamp < lastTimestamp) {
        session.seek(timestamp);
        settledBySeek = true;
      } else {
        session.render(timestamp);
        settledBySeek = false;
      }
      lastTimestamp = timestamp;
    },
    seek: (timestamp) => {
      // A sequential render to this timestamp must not swallow the seek.
      // Otherwise releasing the scrubber continues the frame walk.
      if (timestamp === lastTimestamp && settledBySeek) return;
      session.seek(timestamp);
      lastTimestamp = timestamp;
      settledBySeek = true;
    },
  };
}

class SequentialFrameSession implements FrameSession {
  private __active = true;
  private __invalidated = false;
  private __targetVersion = 0;
  private __target: number;
  private __seekRequest: { timestamp: number; version: number } | null;
  private __pendingFrame: CanvasFrame | null = null;
  private __iterator: AsyncIterator<CanvasFrame> | null = null;
  private __wake: (() => void) | null = null;
  private readonly __sink: CanvasSink;

  constructor(
    private readonly __options: {
      canvasRef: React.RefObject<HTMLCanvasElement | null>;
      firstTimestamp: number;
      greenscreen: boolean | GreenScreenConfig;
      initialTimestamp: number;
      setReadyState: (readyState: number) => void;
      track: NonNullable<Awaited<ReturnType<Input["getPrimaryVideoTrack"]>>>;
    },
  ) {
    this.__sink = new CanvasSink(__options.track, { poolSize: 1 });
    this.__target = this.toTrackTimestamp(__options.initialTimestamp);
    this.__seekRequest = {
      timestamp: this.__target,
      version: this.__targetVersion,
    };
    void this.__run();
  }

  dispose(): void {
    this.__active = false;
    this.__cancelFrames();
  }

  invalidate(): void {
    this.__invalidated = true;
    this.__targetVersion += 1;
    this.__cancelFrames();
  }

  private __cancelFrames(): void {
    this.__seekRequest = null;
    this.__pendingFrame = null;
    this.__closeIterator();
    this.__wakeForUpdate();
  }

  render(timestamp: number): void {
    if (!this.__active || this.__invalidated) return;
    this.__target = this.toTrackTimestamp(timestamp);
    // Playback keeps ticking during a seek. Bumping the version here would
    // drop the seeked frame when it arrives.
    this.__wakeForUpdate();
  }

  seek(timestamp: number): void {
    if (!this.__active) return;
    this.__invalidated = false;
    this.__target = this.toTrackTimestamp(timestamp);
    this.__targetVersion += 1;
    this.__seekRequest = {
      timestamp: this.__target,
      version: this.__targetVersion,
    };
    this.__pendingFrame = null;
    this.__closeIterator();
    this.__wakeForUpdate();
  }

  private async __run(): Promise<void> {
    while (this.__active) {
      try {
        await this.__processStep();
      } catch (error) {
        if (!this.__active) return;
        if (this.__invalidated || this.__seekRequest) continue;
        this.__reportError("Failed to process HLS video frame", error);
        return;
      }
    }
  }

  private async __processStep(): Promise<void> {
    if (this.__invalidated || (!this.__seekRequest && !this.__iterator)) {
      await this.__waitForUpdate();
      return;
    }
    if (this.__seekRequest) {
      await this.__seekToRequest();
      return;
    }
    if (this.__iterator) await this.__processNextFrame(this.__iterator);
  }

  private async __processNextFrame(
    iterator: AsyncIterator<CanvasFrame>,
  ): Promise<void> {
    let frame = this.__pendingFrame;
    this.__pendingFrame = null;
    if (!frame) {
      const result = await iterator.next();
      if (!this.__active) return;
      if (this.__seekRequest || iterator !== this.__iterator) return;
      if (result.done) {
        this.__iterator = null;
        return;
      }
      frame = result.value;
    }

    if (frame.timestamp <= this.__target) {
      this.__draw(frame);
    } else {
      this.__pendingFrame = frame;
      await this.__waitForUpdate();
    }
  }

  private async __seekToRequest(): Promise<void> {
    const request = this.__seekRequest;
    if (!request) return;
    this.__seekRequest = null;

    try {
      const frame = await this.__sink.getCanvas(request.timestamp);
      if (!this.__active) return;
      if (this.__invalidated || this.__seekRequest) return;

      if (
        frame &&
        frame.timestamp <= this.__target &&
        request.version === this.__targetVersion
      ) {
        this.__draw(frame);
      }
      const sequenceStart = frame
        ? frame.timestamp + frame.duration
        : request.timestamp;
      this.__iterator = this.__sink
        .canvases(sequenceStart)
        [Symbol.asyncIterator]();
    } catch (error) {
      if (!this.__active) return;
      if (this.__invalidated || this.__seekRequest) return;
      this.__reportError("Failed to seek HLS video", error);
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

  private __closeIterator(): void {
    const iterator = this.__iterator;
    this.__iterator = null;
    void iterator?.return?.().catch((error: unknown) => {
      if (this.__active) {
        this.__reportError("Failed to stop HLS frame iteration", error);
      }
    });
  }

  private __draw(frame: CanvasFrame): void {
    const didDraw = drawFrame(
      this.__options.canvasRef.current,
      frame.canvas,
      this.__options.greenscreen,
    );
    this.__options.setReadyState(
      didDraw
        ? HTMLMediaElement.HAVE_CURRENT_DATA
        : HTMLMediaElement.HAVE_ENOUGH_DATA,
    );
  }

  private __reportError(message: string, error: unknown): void {
    this.__options.setReadyState(HTMLMediaElement.HAVE_ENOUGH_DATA);
    console.error(`${message} with MediaBunny`, error);
  }

  private toTrackTimestamp(timestamp: number): number {
    return this.__options.firstTimestamp + Math.max(0, timestamp);
  }
}

function drawFrame(
  canvas: HTMLCanvasElement | null,
  frame: HTMLCanvasElement | OffscreenCanvas,
  greenscreen: boolean | GreenScreenConfig,
): boolean {
  if (!canvas) return false;

  if (greenscreen) {
    renderGreenScreen({
      canvas,
      color: typeof greenscreen === "object" ? greenscreen.color : undefined,
      source: frame,
      tolerance:
        typeof greenscreen === "object" ? greenscreen.tolerance : undefined,
    });
    return true;
  }

  const context = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!context) return false;

  if (canvas.width !== frame.width || canvas.height !== frame.height) {
    canvas.width = frame.width;
    canvas.height = frame.height;
  }
  context.drawImage(frame, 0, 0, canvas.width, canvas.height);
  return true;
}
