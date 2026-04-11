export type ImageFormat = "jpeg" | "png";

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
    setColorScheme(scheme: "light" | "dark"): void;
    toggleControls(visible?: boolean): void;
    playback: {
      currentTime: number;
      duration: number;
      play(): Promise<void>;
    };
  };
}

// declare module "puppeteer-core" {
//   export interface Page {
//     screenshot(): Promise<Buffer>;
//   }
// }
