export type ColorScheme = "light" | "dark";

export type ImageFormat = "jpeg" | "png";

export type RenderMode = "screenshot" | "thumbs" | "video";

// hilarious!!
declare global {
  const Liqvid: {
    Utils: {
      misc: {
        waitFor(callback: () => boolean, interval?: number): Promise<void>;
      };
    };
  };
  var player: {
    setColorScheme(scheme: ColorScheme): void;
    setRenderMode(renderMode: RenderMode): void;
    toggleControls(visible?: boolean): void;
    playback: {
      audioSources: Set<{ buffer: AudioBuffer; startTime: number }>;
      currentTime: number;
      duration: number;
      play(): Promise<void>;
    };
  };

  /** for debugging */
  var __pause: boolean | undefined;
}
