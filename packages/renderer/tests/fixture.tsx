import { Playback } from "@liqvid/playback";
import { PlaybackProvider } from "@liqvid/playback/react";
import { createRoot } from "react-dom/client";

// Use the built package to exercise the same worker URL rewriting that app
// bundlers must perform for the media package.
import { HlsVideo } from "../../media/dist/esm/hls/index.js";

const playback = new Playback();
playback.duration = 700;

const root = createRoot(document.getElementById("root")!);

window.__fixture = {
  mount(hls: string) {
    root.render(
      <PlaybackProvider value={playback}>
        <div
          style={{
            bottom: 0,
            height: 180,
            position: "fixed",
            right: 0,
            width: 320,
          }}
        >
          <HlsVideo
            frameAccurate
            hls={hls}
            style={{ height: 180, width: 320 }}
          />
        </div>
      </PlaybackProvider>,
    );
  },
  seek(seconds: number) {
    playback.currentTime = seconds;
  },
};

declare global {
  interface Window {
    __fixture: {
      mount: (hls: string) => void;
      seek: (seconds: number) => void;
    };
  }
}
