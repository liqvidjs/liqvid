export type ColorScheme = "light" | "dark";

export type ImageFormat = "jpeg" | "png";

export type RenderMode = "screenshot" | "thumbs" | "video";

// hilarious!!
declare global {
  var player: {
    setColorScheme(scheme: ColorScheme): void;
    setRenderMode(renderMode: RenderMode): void;
    toggleControls(visible?: boolean): void;
    playback: {
      addEventListener: (
        event: "readystatechange",
        listener: () => void,
      ) => void;
      removeEventListener: (
        event: "readystatechange",
        listener: () => void,
      ) => void;
      audioSources: Set<{ buffer: AudioBuffer; startTime: number }>;
      currentTime: number;
      duration: number;
      readyState: number;
      play(): Promise<void>;
    };
  };

  /** for debugging */
  var __pause: boolean | undefined;
}
