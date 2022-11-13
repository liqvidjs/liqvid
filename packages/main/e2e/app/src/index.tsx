import {createRoot} from "react-dom/client";

import * as Liqvid from "../../../src/index";
import {Playback, Player, Video} from "../../../src/index";

// simplifies testing for now
window.Liqvid = Liqvid;

const playback = new Playback({duration: 60000});

function Lesson() {
  return (
    <Player playback={playback}>
      <Video>
        <source src={process.env.PLAYWRIGHT_TEST_VIDEO} type="video/mp4" />
      </Video>
    </Player>
  );
}

createRoot(document.querySelector("main")).render(<Lesson />);
