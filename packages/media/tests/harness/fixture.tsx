import { Playback } from "@liqvid/playback";
import { PlaybackProvider } from "@liqvid/playback/react";
import { Profiler } from "react";
import { createRoot, type Root } from "react-dom/client";

// Tests run against the compiled package, not the sources.
import { HlsVideo, type HlsVideoProps } from "../../dist/esm/hls/index.js";

export type FixtureApi = {
  commits: number;
  mount: (props: HlsVideoProps) => void;
  playback: Playback;
  readyStates: number[];
  unmount: () => void;
};

declare global {
  interface Window {
    __fixture: FixtureApi;
  }
}

const playback = new Playback();
playback.duration = 700;

const container = document.getElementById("root")!;
let root: Root | null = null;

const fixture: FixtureApi = {
  commits: 0,
  mount(props) {
    root?.unmount();
    root = createRoot(container);
    root.render(
      <PlaybackProvider value={playback}>
        <Profiler
          id="hls"
          onRender={() => {
            fixture.commits += 1;
          }}
        >
          <HlsVideo {...props} />
        </Profiler>
      </PlaybackProvider>,
    );
  },
  playback,
  readyStates: [],
  unmount() {
    root?.unmount();
    root = null;
  },
};

playback.addEventListener("readystatechange", () => {
  fixture.readyStates.push(playback.readyState);
});

window.__fixture = fixture;
