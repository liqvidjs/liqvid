import { createRoot } from "react-dom/client";

import * as Liqvid from "../../../src/index.ts";
import { Playback, Player, Video } from "../../../src/index.ts";

// simplifies testing for now
window.Liqvid = Liqvid;

const playback = new Playback({ duration: 60000 });

function Lesson() {
  return (
    <Player playback={playback}>
      <Video start={10000}>
        <source src={process.env.PLAYWRIGHT_TEST_VIDEO} type="video/mp4" />
      </Video>
    </Player>
  );
}

createRoot(document.querySelector("main")).render(<Lesson />);
