export type ImageFormat = "jpeg" | "png";

// hilarious!!
declare global {
  const Liqvid: {
    Utils: {
      misc: {
        waitFor(callback: () => boolean, interval?: number): Promise<void>;
      }
    }
  }
  var player: {
    canPlay: Promise<void>;
    playback: {
      duration: number;
      play(): Promise<void>;
      seek: (t: number) => void;
    }
  };
}

// declare module "puppeteer-core" {
//   export interface Page {
//     screenshot(): Promise<Buffer>;
//   }
// }
